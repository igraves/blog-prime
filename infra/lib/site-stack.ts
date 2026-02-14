import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import { CloudFrontToS3 } from "@aws-solutions-constructs/aws-cloudfront-s3";
import { Construct } from "constructs";

export interface BlogSiteStackProps extends cdk.StackProps {
  domainName: string;
  hostedZoneId: string;
  certificate: acm.ICertificate;
}

export class BlogSiteStack extends cdk.Stack {
  public readonly bucketArn: string;
  public readonly distributionArn: string;

  constructor(scope: Construct, id: string, props: BlogSiteStackProps) {
    super(scope, id, props);

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      "HostedZone",
      {
        hostedZoneId: props.hostedZoneId,
        zoneName: props.domainName,
      }
    );

    const corsHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      "CorsHeadersPolicy",
      {
        corsBehavior: {
          accessControlAllowOrigins: [
            `https://${props.domainName}`,
            `https://www.${props.domainName}`,
          ],
          accessControlAllowHeaders: ["*"],
          accessControlAllowMethods: ["GET", "HEAD"],
          accessControlAllowCredentials: false,
          accessControlMaxAge: cdk.Duration.seconds(86400),
          originOverride: true,
        },
      }
    );

    const { cloudFrontWebDistribution, s3BucketInterface } =
      new CloudFrontToS3(this, "BlogCdn", {
        bucketProps: {
          removalPolicy: cdk.RemovalPolicy.RETAIN,
          autoDeleteObjects: false,
        },
        cloudFrontDistributionProps: {
          certificate: props.certificate,
          domainNames: [props.domainName, `www.${props.domainName}`],
          defaultRootObject: "index.html",
          errorResponses: [
            {
              httpStatus: 403,
              responseHttpStatus: 404,
              responsePagePath: "/404.html",
              ttl: cdk.Duration.minutes(5),
            },
            {
              httpStatus: 404,
              responseHttpStatus: 404,
              responsePagePath: "/404.html",
              ttl: cdk.Duration.minutes(5),
            },
          ],
        },
        insertHttpSecurityHeaders: false,
      });

    const bucket = s3BucketInterface as s3.IBucket;
    const distribution = cloudFrontWebDistribution;

    // Attach CORS response headers policy so SRI integrity checks work
    const cfnDistribution = distribution.node
      .defaultChild as cloudfront.CfnDistribution;
    cfnDistribution.addPropertyOverride(
      "DistributionConfig.DefaultCacheBehavior.ResponseHeadersPolicyId",
      corsHeadersPolicy.responseHeadersPolicyId
    );

    // Route 53 alias records for apex and www
    for (const recordName of [props.domainName, `www.${props.domainName}`]) {
      new route53.ARecord(this, `ARecord-${recordName}`, {
        zone: hostedZone,
        recordName,
        target: route53.RecordTarget.fromAlias(
          new route53targets.CloudFrontTarget(distribution)
        ),
      });

      new route53.AaaaRecord(this, `AaaaRecord-${recordName}`, {
        zone: hostedZone,
        recordName,
        target: route53.RecordTarget.fromAlias(
          new route53targets.CloudFrontTarget(distribution)
        ),
      });
    }

    this.bucketArn = bucket.bucketArn;
    this.distributionArn = `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`;

    new cdk.CfnOutput(this, "BucketName", {
      value: bucket.bucketName,
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });

    new cdk.CfnOutput(this, "DistributionDomain", {
      value: distribution.distributionDomainName,
    });
  }
}
