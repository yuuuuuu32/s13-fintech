pipeline {
    agent any
    
    environment {
        DOCKER_COMPOSE_FILE = 'docker-compose.yml'
        BACKEND_IMAGE = 'bluemarble-backend'
        BRANCH_NAME = env.BRANCH_NAME ?: 'master'
    }
    
    tools {
        gradle 'Gradle'
    }
    
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
                            cp .env.example .env
                            echo "Environment file created from example"
                        fi
                    '''
                }
            }
        }
        
        stage('Build & Test') {
            steps {
                echo 'Building and testing application...'
                dir('finble-backend') {
                    sh './gradlew clean build -x test'
                }
            }
            post {
                always {
                    // Archive test results if they exist
                    publishTestResults testResultsPattern: 'finble-backend/build/test-results/test/*.xml',
                                      allowEmptyResults: true
                }
            }
        }
        
        stage('Docker Build') {
            steps {
                echo 'Building Docker images...'
                script {
                    sh 'docker-compose build backend'
                }
            }
        }
        
        stage('Deploy') {
            when {
                anyOf {
                    branch 'master'
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                echo 'Deploying application...'
                script {
                    // Stop existing containers
                    sh 'docker-compose down --remove-orphans'
                    
                    // Start services
                    sh 'docker-compose up -d'
                    
                    // Wait for services to be ready
                    sh '''
                        echo "Waiting for services to start..."
                        sleep 30
                        
                        # Health check
                        max_attempts=30
                        attempt=0
                        
                        until curl -f http://localhost:8081/actuator/health || [ $attempt -eq $max_attempts ]; do
                            echo "Health check attempt $((++attempt))/$max_attempts"
                            sleep 10
                        done
                        
                        if [ $attempt -eq $max_attempts ]; then
                            echo "Health check failed after $max_attempts attempts"
                            docker-compose logs backend
                            exit 1
                        fi
                        
                        echo "Application is healthy!"
                    '''
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
                // Show logs for debugging
                sh 'docker-compose logs --tail=50'
            }
        }
        unstable {
            echo 'Pipeline unstable!'
        }
    }
}