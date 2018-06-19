import java.security.MessageDigest

def generateMD5(String s){
  MessageDigest.getInstance("MD5").digest(s.bytes).encodeHex().toString()
}

node {
  checkout scm

  stage 'Builder'
  String hashString = """
    ${new File("${pwd()}/package.json".toString()).getText("UTF-8")}
    ${new File("${pwd()}/scripts/publish".toString()).getText("UTF-8")}
  """
  env.IMAGE_TAG = generateMD5(hashString.toString())
  echo "Using IMAGE_TAG: ${env.IMAGE_TAG}".toString()
  sh 'make docker-pull || make docker docker-push'

  stage 'Test'
  sh 'make docker-test'

  if (env.BRANCH_NAME == 'master') {
    stage 'Publish'
    withCredentials([[$class: 'FileBinding', credentialsId: 'npmrc-icelandair-labs', variable: '_NPMRC']]) {
      sh 'make docker-publish'
    }
  }
}
