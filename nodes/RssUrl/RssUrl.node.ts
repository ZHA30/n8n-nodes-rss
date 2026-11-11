import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import {
	channelProperties,
	getAdditionalFields,
	getChannelProperties,
} from '../shared/fields';
import { channelXml } from '../shared/rss';

export class RssUrl implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RSS URL',
		name: 'rssUrl',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg, @n8n/community-nodes/icon-validation, @n8n/community-nodes/icon-prefer-themed-variants -- Reuse n8n's built-in RSS icon.
		icon: 'node:rss-read',
		iconColor: 'orange-red',
		group: ['trigger'],
		version: 1.1,
		description: 'Start a workflow when an RSS feed is requested',
		subtitle: '={{ "/" + $parameter.path }}',
		defaults: { name: 'RSS URL' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'GET',
				isFullPath: true,
				path: '={{ $parameter.path }}',
				responseMode: 'responseNode',
			},
		],
		properties: [
			{
				displayName: 'Path',
				name: 'path',
				noDataExpression: true,
				type: 'string',
				default: '',
				required: true,
				placeholder: 'news',
				description:
					'Unique GET path, such as news, blog/news, or news.xml, without a leading slash',
			},
			...channelProperties,
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				validatePath.call(this);
				return true;
			},
			async create(): Promise<boolean> {
				return true;
			},
			async delete(): Promise<boolean> {
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		validatePath.call(this);
		const responseType = this.getNode().type.replace(
			/\.rssUrl$/,
			'.rssRespond',
		);
		const responses = this.getChildNodes(this.getNode().name).filter(
			(node) => !node.disabled && node.type === responseType,
		);
		if (responses.length === 0) {
			throw new NodeOperationError(
				this.getNode(),
				'Connect an RSS Respond node downstream',
			);
		}
		const channel = Object.fromEntries(
			getChannelProperties().map(({ name }) => [
				name,
				this.getNodeParameter(name),
			]),
		) as IDataObject;
		channel.additionalFields = getAdditionalFields(
			channel.additionalFields as IDataObject,
		);
		try {
			channelXml(channel);
		} catch (error) {
			throw new NodeOperationError(this.getNode(), error as Error);
		}
		return {
			workflowData: [
				[
					{
						json: {
							headers: this.getHeaderData(),
							query: this.getQueryData() as IDataObject,
							channel,
							feedUrl: this.getNodeWebhookUrl('default'),
						},
					},
				],
			],
		};
	}
}

function validatePath(this: IHookFunctions | IWebhookFunctions): void {
	const path = this.getNodeParameter('path') as string;
	if (!/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*(?:\.xml)?$/.test(path)) {
		throw new NodeOperationError(
			this.getNode(),
			'Use a path such as news, blog/news, or news.xml',
		);
	}
}
