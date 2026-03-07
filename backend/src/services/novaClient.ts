import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.SECRET_ACCESS_KEY;

export const bedrockClient = new BedrockRuntimeClient({
  region: "us-east-1",
  ...(accessKeyId && secretAccessKey
    ? {
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      }
    : {}),
});
