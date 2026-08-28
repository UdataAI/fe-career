#!/usr/bin/env groovy
@Library('jenkins-std-lib') _

// import adp.azure.Azure
// import adp.kubernetes.Kubernetes
import adp.util.Util

// Azure azure = new Azure(this)
// Kubernetes kubernetes = new Kubernetes(this)
Util util = new Util(this)

def clusterEnvs = []

// Will be replaced by the environment-path of the current deployment
String environmentFile = ''
// What branch should be used as a baseline (i.e. for checks)?
String baselineBranch
// The name to use for tagging the image we build, prevents overwriting images of other branches
String tagName = util.getSanitizedBranchName(env.BRANCH_NAME).toLowerCase().take(127) // Max tag length is 127 chars

def loadEnvironmentVariables(path) {
  if (path) {
    echo "Loading clusterEnvs from path: ${path}"
    readYaml file: path
  } else {
    echo 'Not loading any env file due to empty file path.'
  }
}

def isValidDeploymentBranch = env.BRANCH_NAME == 'main' || env.BRANCH_NAME == 'staging' || env.BRANCH_NAME == 'production' || env.BRANCH_NAME == 'testing'


// Initialize deployment environment variables depending on the branch
if (env.BRANCH_NAME == 'testing') {
  environmentFile = 'deployment/udata/career/environment/testing.yaml'
  baselineBranch = env.BRANCH_NAME
} else if (env.BRANCH_NAME == 'staging') {
  environmentFile = 'deployment/udata/career/environment/staging.yaml'
  baselineBranch = env.BRANCH_NAME
} else if (env.BRANCH_NAME == 'production') {
  environmentFile = 'deployment/udata/career/environment/production.yaml'
  baselineBranch = env.BRANCH_NAME
// } else if (util.isPullRequest()) {
//   environmentFile = './environment/privsc-d-001-hwd.yaml'
//   baselineBranch = env.CHANGE_TARGET
} else {
  // Default to main for develope
  environmentFile = 'deployment/udata/career/environment/develop.yaml'
  baselineBranch = 'main'
  tagName = util.getSanitizedBranchName(env.BRANCH_NAME)
}

pipeline {
  agent {
    kubernetes {
      inheritFrom 'default'
    }
  }
  options {
    timestamps()
    timeout(time: 1, unit: 'HOURS')
    parallelsAlwaysFailFast()
    rateLimitBuilds(throttle: [count: 3, durationName: 'minute', userBoost: true])
    buildDiscarder(logRotator(numToKeepStr: '10'))
    durabilityHint('PERFORMANCE_OPTIMIZED')
    disableConcurrentBuilds(abortPrevious: true)
    disableResume()
    disableRestartFromStage()
    ansiColor('xterm')
    skipDefaultCheckout() // Use custom Checkout SCM
  }
  environment {
    TEST_ENV = 'test'
     // ECR_REGISTRY and AWS_REGION should ideally come from the environment file, but for simplicity, we define them here`
  }

  stages {

    stage('Checkout SCM') {
        steps {
            dir('source') {
              checkout([$class: 'GitSCM', 
                branches: scm.branches, 
                doGenerateSubmoduleConfigurations: false, 
                extensions: [[$class: 'CloneOption', depth: 1, noTags: false, reference: '', shallow: true, timeout: 180]], 
                gitTool: 'Default', 
                submoduleCfg: [], 
                userRemoteConfigs: scm.userRemoteConfigs
              ])
            }
        }
    }

    stage ('Prepare') {
        steps {
          dir ('deployment') {
              //git( url: GIT_DEPLOYMENT_REPO, credentialsId: GIT_DEPLOYMENT_CREDENTIAL_ID, branch: GIT_DEPLOYMENT_BRANCH)
              checkout changelog: false, poll: false, scm: scmGit(
                  branches: [[name: "${GIT_DEPLOYMENT_BRANCH}"]],
                  userRemoteConfigs: [[credentialsId: "${GIT_DEPLOYMENT_CREDENTIAL_ID}",url: "${GIT_DEPLOYMENT_REPO}"]]
              )
          }
          script {
            clusterEnvs=loadEnvironmentVariables(environmentFile)
            imageTag = "${BUILD_NUMBER}".toLowerCase()
            imageName = "${clusterEnvs.container_registry}/${clusterEnvs.container_registry_repository}:${imageTag}".toLowerCase()
          }
          sh """
          cp source/Dockerfile.prod source/Dockerfile.prod.bak 2>/dev/null || true
          cp source/nginx.conf source/nginx.conf.bak 2>/dev/null || true
          rsync -rtv deployment/udata/career/overwrite/ source/
          cp -f source/Dockerfile.prod.bak source/Dockerfile.prod 2>/dev/null || true
          cp -f source/nginx.conf.bak source/nginx.conf 2>/dev/null || true
          echo "🔐 Fetching ECR login token..."
          aws ecr get-login-password --region \${AWS_REGION} > \${TOKEN_FILE}
          echo "✅ Token saved to \${TOKEN_FILE}"
          """
        }
    }

    stage('Build Image') {
        steps {
            dir("${env.WORKSPACE}/source") {
                container(name: 'buildah', shell: '/bin/sh') {
                    sh '''
                        set -eux
                        echo "🚀 Login ECR..."
                        cat ${TOKEN_FILE} | buildah login -u AWS --password-stdin ${ECR_REGISTRY}
                    '''
                    sh """
                        set -eux

                        buildah bud \
                        --layers \
                        --format docker \
                        --pull=missing \
                        --jobs=2 \
                        --log-level=error \
                        -t ${imageName} \
                        -f ${clusterEnvs.build_context}/${clusterEnvs.build_dockerfile} \
                        ${clusterEnvs.build_context}

                        buildah push \
                        ${imageName} \
                        docker://${imageName}
                    """
                }
            }
        }
    }

    stage('Deploy') {
        steps {
            dir("${env.WORKSPACE}/deployment") {
                container(name: 'tools', shell: '/bin/sh') {
                  sh """
                  # Auto recover if previous Helm installation/upgrade was interrupted in pending state
                  STATUS=\$(helm status ${clusterEnvs.helm_release} -n ${clusterEnvs.namespace} -o json 2>/dev/null | grep '"status":' || true)
                  if echo "\$STATUS" | grep -q 'pending-install'; then
                    echo "⚠️ Helm release is stuck in pending-install. Uninstalling to reset clean state..."
                    helm uninstall ${clusterEnvs.helm_release} -n ${clusterEnvs.namespace} || true
                  elif echo "\$STATUS" | grep -Eq 'pending-upgrade|pending-rollback'; then
                    echo "⚠️ Helm release is stuck in pending-upgrade/rollback. Rolling back or uninstalling to clear lock..."
                    helm rollback ${clusterEnvs.helm_release} -n ${clusterEnvs.namespace} || helm uninstall ${clusterEnvs.helm_release} -n ${clusterEnvs.namespace} || true
                  fi

                  helm upgrade -i ${clusterEnvs.helm_release}  ${clusterEnvs.helm_context} \
                    --set-string deployment.image.tag=${imageTag} \
                    -f  ${clusterEnvs.helm_values} \
                    -n ${clusterEnvs.namespace} \
                    --wait --timeout 5m0s 
                  """
                }
            }
        }
    }

  }

  post {
      always {
          echo 'Ok'
          }
      success {
          discordSend description: "**_NOTE:_** 🔥 Jenkins Pipeline success", footer: "Jenkins", link: env.BUILD_URL, result: currentBuild.currentResult, title: env.JOB_NAME, webhookURL: env.DISCORD_WEBHOOK_URL
      }
      unstable {
          echo 'I am unstable :/'
      }
      failure {
          discordSend description: "**_NOTE:_** 🔥 Jenkins Pipeline failure", link: env.BUILD_URL, result: currentBuild.currentResult, title: env.JOB_NAME, webhookURL: env.DISCORD_WEBHOOK_URL
      }
      changed {
          echo 'Things were different before...'
      }
  }
  
}
