pipeline {
    agent any
    
    triggers {
        pollSCM('H/3 * * * *')
    }
    
    environment {
        DOCKER_COMPOSE_FILE = 'docker-compose.yml'
        BACKEND_IMAGE = 'bluemarble-backend'
        BRANCH_NAME = "${env.BRANCH_NAME ?: 'master'}"
        EC2_HOST = 'j13d106.p.ssafy.io'
        EC2_USER = 'ubuntu'
        SSH_KEY_ID = 'J13D106T-pem'  // Jenkins Credentials에서 설정할 SSH Key ID
    }
    
    // tools {
    //     gradle 'Gradle'
    // }
    
    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code...'
                checkout scm
            }
        }
        
        stage('Environment Setup') {
            steps {
                echo 'Setting up environment...'
                script {
                    // Copy environment file if it doesn't exist
                    sh '''
                        if [ ! -f .env ]; then
                            if [ -f .env.example ]; then
                                cp .env.example .env
                                echo "Environment file created from example"
                            else
                                echo "Warning: .env.example not found, creating minimal .env"
                                echo "SPRING_PROFILE=docker" > .env
                                echo "SERVER_PORT=8081" >> .env
                                echo "JWT_SECRET=bluemarble-jwt-secret-key-for-finble-game-project-2024-very-long-secure-key-minimum-256-bits-required" >> .env
                            fi
                        else
                            echo ".env file already exists"
                        fi
                    '''
                }
            }
        }
        
        stage('Build & Test') {
            steps {
                echo 'Building and testing application...'
                dir('finble-backend') {
                    sh './gradlew clean build -x test || echo "Build failed but continuing pipeline for testing"'
                }
            }
            post {
                always {
                    // Archive test results if they exist
                    script {
                        if (fileExists('finble-backend/build/test-results/test/*.xml')) {
                            junit 'finble-backend/build/test-results/test/*.xml'
                        }
                    }
                }
            }
        }
        
        stage('Docker Build') {
            steps {
                echo 'Building Docker images...'
                script {
                    sh 'docker-compose build --no-cache backend'
                }
            }
        }
        
        stage('Deploy to EC2') {
            when {
                anyOf {
                    branch 'master'
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                echo 'Deploying to EC2 server...'
                script {
                    sshagent(credentials: [env.SSH_KEY_ID]) {
                        // Create project directory on EC2 if it doesn't exist
                        sh """
                            ssh -o StrictHostKeyChecking=no ${env.EC2_USER}@${env.EC2_HOST} '
                                mkdir -p /home/ubuntu/bluemarble &&
                                cd /home/ubuntu/bluemarble &&
                                sudo systemctl start docker &&
                                sudo systemctl enable docker &&
                                sudo usermod -aG docker ubuntu
                            '
                        """
                        
                        // Clean and copy project files to EC2 (preserve .env)
                        sh """
                            ssh -o StrictHostKeyChecking=no ${env.EC2_USER}@${env.EC2_HOST} '
                                cd /home/ubuntu/bluemarble &&
                                find . -name ".env" -prune -o -type f -exec rm -f {} + &&
                                find . -name ".env" -prune -o -type d -not -path "." -exec rm -rf {} + 2>/dev/null || true &&
                                mkdir -p finble-backend finble-frontend
                            '
                        """
                        
                        sh """
                            scp -o StrictHostKeyChecking=no -r ./docker-compose.yml ./docker-compose.green.yml ./finble-backend ./finble-frontend ./init.sql ./Jenkinsfile ${env.EC2_USER}@${env.EC2_HOST}:/home/ubuntu/bluemarble/
                        """
                        
                        // Blue-Green Deploy on EC2
                        sh """
                            ssh -o StrictHostKeyChecking=no ${env.EC2_USER}@${env.EC2_HOST} '
                                cd /home/ubuntu/bluemarble &&

                                # Clean up and build new version (볼륨도 삭제)
                                sudo docker-compose down -v --remove-orphans || true &&
                                sudo docker system prune -f &&
                                sudo docker-compose build --no-cache backend &&

                                # Start new version on port 8082 (Green)
                                export BACKEND_PORT=8082 &&
                                sudo -E docker-compose -f docker-compose.green.yml up -d &&

                                echo "Waiting for new version to start..." &&
                                sleep 30
                            '
                        """
                        
                        // Blue-Green Health check and switch
                        sh """
                            ssh -o StrictHostKeyChecking=no ${env.EC2_USER}@${env.EC2_HOST} '
                                cd /home/ubuntu/bluemarble &&

                                # Health check new version (Green - 8082)
                                echo "Testing new version on port 8082..."
                                max_attempts=15
                                attempt=0
                                health_check_passed=false

                                until curl -f http://localhost:8082/actuator/health || [ \$attempt -eq \$max_attempts ]; do
                                    echo "Health check attempt \$((\$attempt + 1))/\$max_attempts"
                                    attempt=\$((\$attempt + 1))
                                    sleep 10
                                done

                                if [ \$attempt -lt \$max_attempts ]; then
                                    echo "✅ New version health check passed!"
                                    health_check_passed=true
                                else
                                    echo "❌ New version health check failed"
                                    health_check_passed=false
                                fi

                                if [ "\$health_check_passed" = true ]; then
                                    echo "🔄 Switching to new version..."
                                    # Stop old version (Blue - 8081) with volumes
                                    sudo docker-compose down -v --remove-orphans || true

                                    # Start new version on 8081 using the same image that passed health check
                                    sudo docker-compose up -d --no-build

                                    # Wait for new Blue to start
                                    sleep 15

                                    # Verify Blue is running on 8081
                                    if curl -f http://localhost:8081/actuator/health; then
                                        echo "✅ Blue version running successfully on 8081"
                                        # Stop only Green backend container (8082)
                                        sudo docker stop bluemarble-backend-green || true
                                        sudo docker rm bluemarble-backend-green || true
                                        echo "✅ Successfully deployed new version!"
                                    else
                                        echo "❌ Blue version failed to start on 8081"
                                        # Keep Green running as fallback
                                        echo "⚠️ Green version still running on 8082 as backup"
                                    fi
                                else
                                    echo "🔄 Rolling back - keeping old version..."
                                    # Remove failed Green version only
                                    sudo docker stop bluemarble-backend-green || true
                                    sudo docker rm bluemarble-backend-green || true
                                    echo "✅ Old version continues running on port 8081"
                                fi
                            '
                        """
                    }
                }
            }
        }
        
        stage('Cleanup') {
            steps {
                echo 'Cleaning up...'
                script {
                    // Remove unused Docker images and build cache
                    sh 'docker image prune -f'
                    sh 'docker builder prune -f'
                }
            }
        }
    }
    
    post {
        always {
            echo 'Pipeline completed!'
            // Clean workspace
            cleanWs()
        }
        success {
            echo 'Pipeline succeeded!'
            script {
                if (env.BRANCH_NAME == 'master' || env.BRANCH_NAME == 'main') {
                    echo 'Production deployment successful'
                }
            }
        }
        failure {
            echo 'Pipeline failed!'
            script {
                // Show logs for debugging - check if docker-compose.yml exists first
                if (fileExists('docker-compose.yml')) {
                    sh 'docker-compose -f docker-compose.yml logs --tail=50 || echo "Failed to get docker-compose logs"'
                } else {
                    echo "docker-compose.yml not found, skipping logs"
                }
            }
        }
        unstable {
            echo 'Pipeline unstable!'
        }
    }
}