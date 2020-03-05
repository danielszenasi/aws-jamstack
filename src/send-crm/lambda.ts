import axios from "axios";

interface Record {
  eventID: string;
  eventName: "INSERT";
  eventVersion: string;
  eventSource: string;
  awsRegion: string;
  dynamodb: {
    ApproximateCreationDateTime: number;
    Keys: {
      loan_application_id: {
        S: string;
      };
    };
    NewImage: {
      loan_application_id: {
        S: string;
      };
      email: {
        S: string;
      };
      firstName: {
        S: string;
      };
      lastName: {
        S: string;
      };
      phone: {
        S: string;
      };
    };
    SequenceNumber: string;
    SizeBytes: number;
    StreamViewType: string;
  };
  eventSourceARN: string;
}

export const handler = async (
  event: {
    Records: Record[];
  },
  context: any = {}
): Promise<any> => {
  console.log("request:", JSON.stringify(event, undefined, 2));
  for (let record of event.Records) {
    switch (record.eventName) {
      case "INSERT": {
        await axios.post(
          "https://danielszenasi.api-us1.com/api/3/contact/sync",
          {
            contact: {
              email: record.dynamodb.NewImage.email.S,
              firstName: record.dynamodb.NewImage.firstName.S,
              lastName: record.dynamodb.NewImage.lastName.S,
              phone: record.dynamodb.NewImage.phone.S
            }
          },
          {
            headers: {
              "Api-Token":
                "68cd94e7426301b23367c2bbc342428bb0d6bf02d70d87c13aa18e20fff188c874d52b87"
            }
          }
        );
      }
    }
  }
  // https://danielszenasi.api-us1.com/api/3/contact/sync
};
