const { DynamoDB } = require("aws-sdk");
import { v4 as uuidv4 } from "uuid";

const documentClient = new DynamoDB.DocumentClient();

export const handler = async (
  event: any = {},
  context: any = {}
): Promise<any> => {
  const { email, firstName, lastName, phone } = JSON.parse(event.body);
  const params = {
    TableName: process.env.LOAN_APPLICATION_TABLE_NAME,
    Item: {
      loan_application_id: uuidv4(),
      email,
      firstName,
      lastName,
      phone
    }
  };
  try {
    await documentClient.put(params).promise();
    const response = {
      statusCode: 200
    };
    return response;
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify(e)
    };
  }
};
