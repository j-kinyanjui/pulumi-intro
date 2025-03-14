import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import {AmplifyClient, StartDeploymentCommand} from "@aws-sdk/client-amplify";

const accountId = aws.getCallerIdentityOutput({}).accountId;

// Create an AWS resource (S3 Bucket)
const bucket = new aws.s3.BucketV2("pulumi-intro-bucket", {tags: {name: "pulumi-tutorial"}});

const website = new aws.s3.BucketWebsiteConfigurationV2("website", {
    bucket: bucket.id,
    indexDocument: {
        suffix: "index.html"
    }
});

const bucketObject = new aws.s3.BucketObject("index.html", {
        bucket: bucket.id,
        source: new pulumi.asset.FileAsset("website/index.html"),
        contentType: "text/html",
    },
);

const amplifyApp = new aws.amplify.App("static-website", {
    name: "my-static-app",
    platform: "WEB",
});

// Create an Amplify branch for deployment
const amplifyBranch = new aws.amplify.Branch("mainBranch", {
    appId: amplifyApp.id,
    branchName: "main",
});

// Construct the policy
const policyDoc = pulumi.all([bucket.arn, amplifyApp.id, amplifyBranch.branchName, accountId]).apply(([bucketArn, appId, branchName, accId]) => JSON.stringify({
    Version: "2012-10-17",
    Statement: [
        {
            Sid: "AllowAmplifyToListBucket",
            Effect: "Allow",
            Principal: {Service: "amplify.amazonaws.com"},
            Action: "s3:ListBucket",
            Resource: `${bucketArn}`,
            Condition: {
                StringEquals: {
                    "aws:SourceAccount": accId,
                    "aws:SourceArn": `arn%3Aaws%3Aamplify%3A${aws.config.region}%3A${accId}%3Aapps%2F${appId}%2Fbranches%2F${branchName}`,
                    "s3:prefix": ""
                }
            }
        },
        {
            Sid: "AllowAmplifyToReadObjects",
            Effect: "Allow",
            Principal: {Service: "amplify.amazonaws.com"},
            Action: "s3:GetObject",
            Resource: `${bucketArn}/*`,
            Condition: {
                StringEquals: {
                    "aws:SourceAccount": accId,
                    "aws:SourceArn": `arn%3Aaws%3Aamplify%3A${aws.config.region}%3A${accId}%3Aapps%2F${appId}%2Fbranches%2F${branchName}`
                }
            }
        },
        {
            Sid: "EnforceTLS",
            Effect: "Deny",
            Principal: "*",
            Action: "s3:*",
            Resource: `${bucketArn}/*`,
            Condition: {
                Bool: {"aws:SecureTransport": "false"}
            }
        }
    ]
}));

// Make the bucket accessible by Amplify
const bucketPolicy = new aws.s3.BucketPolicy("bucketPolicy", {
    bucket: bucket.id,
    policy: bucket.id.apply(bucketName => policyDoc)
});

// Connect Amplify to S3 bucket
const amplifyHosting = new aws.amplify.Webhook("amplifyHostingWebhook", {
    appId: amplifyApp.id,
    branchName: amplifyBranch.branchName,
    description: "Webhook for triggering Amplify deployment",
})

amplifyHosting.id.apply(() => {
    // Create an AWS Amplify client
    const amplifyClient = new AmplifyClient({region: aws.config.region});

    // Function to trigger Amplify deployment
    pulumi.all([amplifyApp.id, amplifyBranch.branchName, bucket.id]).apply(([appId, branch, bucketId]) => {

        const command = new StartDeploymentCommand({
            appId: appId,
            branchName: branch,
            sourceUrl: `s3://${bucketId}`,
            sourceUrlType: "BUCKET_PREFIX",
        });

        amplifyClient.send(command)
            .then(res => console.log("Amplify deployment started:", res.$metadata))
            .catch(error => console.error("Error starting Amplify deployment:", error));
    });
})

// Export the name of the bucket and endpoint
export const bucketName = bucket.id;
export const bucketEndpoint = pulumi.interpolate`http://${website.websiteEndpoint}`;
export const amplifyEndpoint = pulumi.interpolate`https://${amplifyBranch.branchName}.${amplifyApp.defaultDomain}`;
