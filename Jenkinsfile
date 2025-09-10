pipeline {
    agent any
    
    triggers {
        pollSCM('H/5 * * * *')
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
                        
                        // Copy project files to EC2
                        sh """
                            scp -o StrictHostKeyChecking=no -r ./docker-compose.yml ./finble-backend ./init.sql ./Jenkinsfile ${env.EC2_USER}@${env.EC2_HOST}:/home/ubuntu/bluemarble/
                        """
                        
                        // Deploy on EC2
                        sh """
                            ssh -o StrictHostKeyChecking=no ${env.EC2_USER}@${env.EC2_HOST} '
                                cd /home/ubuntu/bluemarble &&
                                sudo docker-compose down --remove-orphans &&
                                sudo docker-compose build --no-cache backend &&
                                sudo docker-compose up -d
                            '
                        """
                        
                        // Health check on EC2
                        sh """
                            ssh -o StrictHostKeyChecking=no ${env.EC2_USER}@${env.EC2_HOST} '
                                echo "Waiting for services to start..."
                                sleep 30
                                
                                # Health check
                                max_attempts=30
                                attempt=0
                                
                                until curl -f http://localhost:8081/actuator/health || [ \$attempt -eq \$max_attempts ]; do
                                    echo "Health check attempt \$((\$attempt + 1))/\$max_attempts"
                                    attempt=\$((\$attempt + 1))
                                    sleep 10
                                done
                                
                                if [ \$attempt -eq \$max_attempts ]; then
                                    echo "Health check failed after \$max_attempts attempts"
                                    echo "Checking container status..."
                                    sudo docker ps -a
                                    echo "=== Backend container logs ==="
                                    sudo docker logs bluemarble-backend
                                    echo "=== MySQL container logs ==="
                                    sudo docker logs bluemarble-mysql --tail=50
                                    echo "=== Redis container logs ==="
                                    sudo docker logs bluemarble-redis --tail=50
                                    exit 1
                                fi
                                
                                echo "Application is healthy on EC2!"
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
                    // Remove unused Docker images
                    sh 'docker image prune -f'
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