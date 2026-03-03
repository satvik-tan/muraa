import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: "us-east-1", // change if needed
});

async function test() {
  const command = new InvokeModelCommand({
    modelId: "amazon.nova-pro-v1:0", // use Nova Pro for quick test
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          content: [{ text: "Hello, can you respond with one sentence?" }],
        },
      ],
    }),
    contentType: "application/json",
  });

  const response = await client.send(command);

  const decoded = new TextDecoder().decode(response.body);
  console.log(decoded);
}

test().catch(console.error);