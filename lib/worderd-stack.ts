import {
	aws_cloudfront,
	aws_cloudfront_origins,
	aws_ec2,
	aws_ecs,
	aws_elasticloadbalancingv2,
	CfnOutput,
	Duration,
	Stack,
	type StackProps,
} from "aws-cdk-lib";
import type { Construct } from "constructs";

export interface WorkerdStackProps extends StackProps {
	vpc: aws_ec2.IVpc;
}

export class WorkerdStack extends Stack {
	constructor(scope: Construct, id: string, props: WorkerdStackProps) {
		super(scope, id, props);

		const alb = new aws_elasticloadbalancingv2.ApplicationLoadBalancer(
			this,
			"Alb",
			{
				vpc: props.vpc,
				preserveHostHeader: true,
				vpcSubnets: { subnetType: aws_ec2.SubnetType.PRIVATE_WITH_EGRESS },
			},
		);
		const listener = alb.addListener("Listener", {
			protocol: aws_elasticloadbalancingv2.ApplicationProtocol.HTTP,
		});

		const cluster = new aws_ecs.Cluster(this, "Cluster", { vpc: props.vpc });
		const taskDefinition = new aws_ecs.FargateTaskDefinition(
			this,
			"TaskDefinition",
			{
				cpu: 1024,
				memoryLimitMiB: 2048,
				runtimePlatform: {
					cpuArchitecture: aws_ecs.CpuArchitecture.ARM64,
					operatingSystemFamily: aws_ecs.OperatingSystemFamily.LINUX,
				},
			},
		);
		taskDefinition.addContainer("Workerd", {
			image: aws_ecs.ContainerImage.fromAsset("./"),
			containerName: "workerd",
			portMappings: [{ containerPort: 80 }],
		});
		const service = new aws_ecs.FargateService(this, "Service", {
			cluster,
			taskDefinition,
			desiredCount: 1,
			minHealthyPercent: 50,
			maxHealthyPercent: 200,
		});
		listener.addTargets("WorkerdTarget", {
			targets: [service],
			protocol: aws_elasticloadbalancingv2.ApplicationProtocol.HTTP,
			deregistrationDelay: Duration.seconds(0),
		});

		const distribution = new aws_cloudfront.Distribution(
			this,
			"Distribution2",
			{
				defaultBehavior: {
					origin: aws_cloudfront_origins.VpcOrigin.withApplicationLoadBalancer(
						alb,
						{ protocolPolicy: aws_cloudfront.OriginProtocolPolicy.HTTP_ONLY },
					),
					cachePolicy: aws_cloudfront.CachePolicy.CACHING_DISABLED,
					viewerProtocolPolicy: aws_cloudfront.ViewerProtocolPolicy.ALLOW_ALL,
					originRequestPolicy: aws_cloudfront.OriginRequestPolicy.ALL_VIEWER,
					allowedMethods: aws_cloudfront.AllowedMethods.ALLOW_ALL,
					compress: true,
				},
			},
		);
		new CfnOutput(this, "DistributionUrl", {
			value: `https://${distribution.distributionDomainName}/`,
		});
	}
}
