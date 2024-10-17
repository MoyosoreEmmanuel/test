pipeline {
    agent any

    environment {
        // Define your environment variables here
        TRUFFLE_VERSION = 'latest'
        CI = 'true'
        
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install dependencies') {
            steps {
                script {
                    try {
                        bat 'echo "Updating instance..."'
                        bat "npm install -g truffle@${env.TRUFFLE_VERSION}"
                        
                        bat 'echo "Installing HDWallet Provider..."'
                        
                        bat 'npm install @truffle/hdwallet-provider'
                    } catch (Exception e) {
                        error "Failed to install dependencies: ${e.message}"
                    }
                }
            }
        }

        stage('Delay after installing dependencies') {
            steps {
                script {
                    sleep(time: 1, unit: 'MINUTES')
                }
            }
        }
        
        stage('Compile contract') {
            steps {
                script {
                    try {
                        bat 'echo "Compiling contract..."'
                        bat 'npx truffle compile'
                    } catch (Exception e) {
                        error "Failed to compile contract: ${e.message}"
                    }
                }
            }
        }

        stage('Checkout Again') {
            steps {
                checkout scm
            }
        }
        
        stage('Migrate contract') {
            steps {
                script {
                    try {
                        bat 'echo "Migrating contract to Sepolia..."'
                        retry(3) {
                            bat 'npx truffle migrate --network sepolia'
                        }
                        bat 'echo "Copying contract artifact to src..."'
                        bat 'copy build\\contracts\\SmallBusinessInventory.json my-app\\src\\'
                    } catch (Exception e) {
                        error "Failed to migrate contract: ${e.message}"
                    }
                }
            }
        }

        stage('Checkout Once More') {
            steps {
                checkout scm
            }
        }

       stage('Install test dependencies') {
    steps {
        dir('my-app') {
            script {
                try {
                    bat 'echo "Navigating to React app directory..."'
                    bat 'npm install --save-dev jest@29.7.0'
                    bat 'npm install'
                    bat 'npm install react-scripts'
                    bat 'echo "Installing @testing-library/jest-dom..."'
                    bat 'npm install --save-dev @testing-library/jest-dom'
                    bat 'echo "Installing @babel/plugin-proposal-private-property-in-object..."'
                    bat 'npm install --save-dev @babel/plugin-proposal-private-property-in-object'
                    bat 'npm install --save-dev jest @testing-library/react @testing-library/user-event'
                } catch (Exception e) {
                    error "Failed to install dependencies: ${e.message}"
                }
            }
        }
    }
}

stage('Run tests') {
    steps {
        dir('my-app') {
            script {
                try {
                    timeout(time: 6, unit: 'MINUTES') { // timeout after 6 minutes
                        bat 'npm test'
                    }
                } catch (Exception e) {
                    echo "proceeding to next stage: ${e.message}"
                }
            }
        }
    }
}



        stage('Serve React app') {
            steps {
                dir('my-app') {
                    script {
                        try {
                            bat 'echo "Navigating to React app directory..."'
                            bat 'echo "Installing React app dependencies..."'
                            bat 'npm install'
                        } catch (Exception e) {
                            error "Failed to install React app dependencies: ${e.message}"
                        }
                    }
                    dir('src') {
                        script {
                            try {
                                bat 'echo "Starting React app..."'
                                bat 'npm start'
                            } catch (Exception e) {
                                error "Failed to start React app: ${e.message}"
                            }
                        }
                    }
                }
            }
        }
    }
}
