import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Create an AWS resource (S3 Bucket)
const bucket = new aws.s3.BucketV2("pulumi-intro-bucket", {tags: {name: "pulumi-tutorial"}});

const website = new aws.s3.BucketWebsiteConfigurationV2("website", {
    bucket: bucket.id,
    indexDocument: {
        suffix: "index.html"
    }
});

const ownershipControl = new aws.s3.BucketOwnershipControls("ownership-ctrl", {
    bucket: bucket.id,
    rule: {
        objectOwnership: "ObjectWriter"
    }
})

const publicAccessBlock = new aws.s3.BucketPublicAccessBlock("public-access-block", {
    bucket: bucket.id,
    blockPublicAcls: false,
});

const bucketObject = new aws.s3.BucketObject("index.html", {
    bucket: bucket.id,
    source: new pulumi.asset.FileAsset("website/index.html"),
    contentType: "text/html",
    acl: "public-read",
}, {dependsOn: [publicAccessBlock, ownershipControl, website]});

// Export the name of the bucket and endpoint
export const bucketName = bucket.id;
export const bucketEndpoint = pulumi.interpolate`http://${website.websiteEndpoint}`;
