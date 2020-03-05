import * as codebuild from "@aws-cdk/aws-codebuild";
import * as codecommit from "@aws-cdk/aws-codecommit";
import * as codepipeline from "@aws-cdk/aws-codepipeline";
import * as codepipeline_actions from "@aws-cdk/aws-codepipeline-actions";
import * as lambda from "@aws-cdk/aws-lambda";
import * as s3 from "@aws-cdk/aws-s3";
import { App, Stack, StackProps, SecretValue } from "@aws-cdk/core";

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

    const frontendBuild = new codebuild.PipelineProject(this, "FrontendBuild", {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            commands: ["cd frontend", "npm install"]
          },
          build: {
            commands: "npm run build"
          }
        },
        artifacts: {
          "base-directory": "frontend",
          files: ["index.html"]
        }
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1
      }
    });

    // const cdkBuildOutput = new codepipeline.Artifact("CdkBuildOutput");
    const frontendBuildOutput = new codepipeline.Artifact(
      "FrontendBuildOutput"
    );
    const targetBucket = new s3.Bucket(this, "FrontendBucket", {});
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
        },
        {
          stageName: "Deploy",
          actions: [
            new codepipeline_actions.S3DeployAction({
              actionName: "S3Deploy",
              bucket: targetBucket,
              input: frontendBuildOutput
            })
          ]
        }
      ]
    });
  }
}
