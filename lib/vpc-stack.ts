import { type Environment, Stack, type StackProps, aws_ec2 } from "aws-cdk-lib";
import { FckNatInstanceProvider } from "cdk-fck-nat";
import type { Construct } from "constructs";

export interface VpcStackProps extends StackProps {
	env: Environment;
	vpcProps: {
		cidr: string;
		vpcName?: string;
		maxAzs?: number;
		natGateways?: number;
		/**
		 * Replace the manage NAT Gateway by fck-nat.
		 * {@link https://fck-nat.dev}
		 * @default false
		 */
		useFckNatProvider?: boolean;
	};
}

export class VpcStack extends Stack {
	vpc: aws_ec2.IVpc;

	constructor(scope: Construct, id: string, props: VpcStackProps) {
		super(scope, id, props);

		const useFckNatProvider = props.vpcProps.useFckNatProvider ?? false;
		const natGatewayProvider = useFckNatProvider
			? new FckNatInstanceProvider({
					instanceType: aws_ec2.InstanceType.of(
						aws_ec2.InstanceClass.T4G,
						aws_ec2.InstanceSize.NANO,
					),
				})
			: undefined;

		this.vpc = new aws_ec2.Vpc(this, "Vpc", {
			vpcName: props.vpcProps.vpcName,
			maxAzs: props.vpcProps.maxAzs,
			ipProtocol: aws_ec2.IpProtocol.DUAL_STACK,
			ipAddresses: aws_ec2.IpAddresses.cidr(props.vpcProps.cidr),
			natGatewayProvider: natGatewayProvider,
			natGateways: props.vpcProps.natGateways,
			subnetConfiguration: [
				{
					name: "public",
					subnetType: aws_ec2.SubnetType.PUBLIC,
					mapPublicIpOnLaunch: true,
				},
				{
					name: "private-with-egress",
					subnetType: aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
				},
				{
					name: "private-isolated",
					subnetType: aws_ec2.SubnetType.PRIVATE_ISOLATED,
				},
				{
					name: "public-reserved",
					reserved: true,
					subnetType: aws_ec2.SubnetType.PUBLIC,
					mapPublicIpOnLaunch: true,
				},
				{
					name: "private-with-egress-reserved",
					reserved: true,
					subnetType: aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
				},
				{
					name: "private-isolated-reserved",
					reserved: true,
					subnetType: aws_ec2.SubnetType.PRIVATE_ISOLATED,
				},
			],
		});

		if (natGatewayProvider) {
			natGatewayProvider.securityGroup.addIngressRule(
				aws_ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
				aws_ec2.Port.allTraffic(),
			);
		}
	}
}
