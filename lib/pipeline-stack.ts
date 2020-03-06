import * as codebuild from "@aws-cdk/aws-codebuild";
import * as codecommit from "@aws-cdk/aws-codecommit";
import * as codepipeline from "@aws-cdk/aws-codepipeline";
import * as codepipeline_actions from "@aws-cdk/aws-codepipeline-actions";
import * as lambda from "@aws-cdk/aws-lambda";
import * as s3 from "@aws-cdk/aws-s3";
import { App, Stack, StackProps, SecretValue } from "@aws-cdk/core";
import { CloudFrontWebDistribution } from "@aws-cdk/aws-cloudfront";
import * as SSM from "@aws-cdk/aws-ssm";

// export interface PipelineStackProps extends StackProps {
//   readonly lambdaCode: lambda.CfnParametersCode;
// }

export class PipelineStack extends Stack {
  constructor(app: App, id: string) {
    super(app, id);

    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: "GitHub_Source",
      owner: "danielszenasi",
      repo: "aws-jamstack",
      oauthToken: SecretValue.secretsManager("my-github-token"),
      output: sourceOutput,
      branch: "master" // default: 'master'
    });

    // const cdkBuild = new codebuild.PipelineProject(this, "CdkBuild", {
    //   buildSpec: codebuild.BuildSpec.fromObject({
    //     version: "0.2",
    //     phases: {
    //       install: {
    //         commands: "npm install"
    //       },
    //       build: {
    //         commands: ["npm run build", "npm run cdk synth -- -o dist"]
    //       }
    //     },
    //     artifacts: {
    //       "base-directory": "dist",
    //       files: ["LambdaStack.template.json"]
    //     }
    //   }),
    //   environment: {
    //     buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1
    //   }
    // });
    // const lambdaBuild = new codebuild.PipelineProject(this, "LambdaBuild", {
    //   buildSpec: codebuild.BuildSpec.fromObject({
    //     version: "0.2",
    //     phases: {
    //       install: {
    //         commands: ["cd lambda", "npm install"]
    //       },
    //       build: {
    //         commands: "npm run build"
    //       }
    //     },
    //     artifacts: {
    //       "base-directory": "lambda",
    //       files: ["index.js", "node_modules/**/*"]
    //     }
    //   }),
    //   environment: {
    //     buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1
    //   }
    // });

    const targetBucket = new s3.Bucket(this, "FrontendBucket", {
      websiteIndexDocument: "index.html",
      publicReadAccess: true
    });

    const frontendBuild = new codebuild.PipelineProject(this, "FrontendBuild", {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            commands: ["touch .npmignore", "npm install -g gatsby"]
          },
          pre_build: {
            commands: ["cd frontend", "npm ci --production"]
          },
          build: {
            commands: "npm run-script build"
          },
          post_build: {
            commands: "npm run-script deploy"
          }
        },
        artifacts: {
          "base-directory": "frontend/public",
          files: ["**/*"]
        }
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1,
        environmentVariables: {
          BUCKET_NAME: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: targetBucket.bucketName
          }
        }
      }
    });

    // const cdkBuildOutput = new codepipeline.Artifact("CdkBuildOutput");
    const frontendBuildOutput = new codepipeline.Artifact(
      "FrontendBuildOutput"
    );

    // // Store S3 Bucket Name in Parameter Store
    // new SSM.StringParameter(this, "SSMBucketAssetsName", {
    //   description: "S3 Bucket Name for Assets",
    //   parameterName: `/${props.name}/S3/Assets/Name`,
    //   stringValue: targetBucket.bucketName
    // });

    // // Store S3 DomainName Name in Parameter Store
    // new SSM.StringParameter(this, "SSMBucketAssetsDomainName", {
    //   description: "S3 Bucket DomainName for Assets",
    //   parameterName: `/${props.name}/S3/Assets/DomainName`,
    //   stringValue: targetBucket.bucketDomainName
    // });

    const distribution = new CloudFrontWebDistribution(this, "MyDistribution", {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: targetBucket
          },
          behaviors: [{ isDefaultBehavior: true }]
        }
      ]
    });

    new codepipeline.Pipeline(this, "Pipeline", {
      stages: [
        {
          stageName: "Source",
          actions: [sourceAction]
        },
        {
          stageName: "Build",
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: "Frontend_Build",
              project: frontendBuild,
              input: sourceOutput,
              outputs: [frontendBuildOutput]
            })
          ]
        }
      ]
    });
  }
}
