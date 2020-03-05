import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as apigw from "@aws-cdk/aws-apigateway";
import { DynamoEventSource } from "@aws-cdk/aws-lambda-event-sources";
import * as dynamodb from "@aws-cdk/aws-dynamodb";

export class LoanComparisonStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const loanApplicationTable = new dynamodb.Table(this, "LoanApplication", {
      partitionKey: {
        name: "loan_application_id",
        type: dynamodb.AttributeType.STRING
      },
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
    });

    const createLoanApplication = new lambda.Function(
      this,
      "CreateLoanApplicationFunction",
      {
        runtime: lambda.Runtime.NODEJS_10_X,
        code: lambda.Code.fromAsset("src/create-loan-application"),
        handler: "lambda.handler",
        environment: {
          LOAN_APPLICATION_TABLE_NAME: loanApplicationTable.tableName
        }
      }
    );

    loanApplicationTable.grantReadWriteData(createLoanApplication);

    const sendCrmHandler = new lambda.Function(this, "SendCrmFunction", {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.fromAsset("src/send-crm"),
      handler: "lambda.handler"
    });

    sendCrmHandler.addEventSource(
      new DynamoEventSource(loanApplicationTable, {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON
      })
    );

    const api = new apigw.RestApi(this, "hello-api", {});
    const postLoanApplicationsIntegration = new apigw.LambdaIntegration(
      createLoanApplication
    );
    const loanApplications = api.root.addResource("loan-applications");
    loanApplications.addMethod("POST", postLoanApplicationsIntegration);
  }
}
