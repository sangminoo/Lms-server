pipeline {
    agent any
    
    tools {
        nodejs "nodejs"
    }

    stages {
    // stage('Checkout') {
    //         steps {
    //             // Check out code from the repository
    //             git 'https://github.com/sangminoo/Lms-server'
    //         }
    //     }

                 // Install dependencies and build the project
        stage("install") {
            steps {
                sh 'npm install'
            }
        }
        stage("build") {
            steps {
                sh 'npm run build'
            }
        }
    } 
    
    post {
        success {
            echo "SUCCESSFUL"
        }
        failure {
            echo "FAILED"
        }
    }
}
