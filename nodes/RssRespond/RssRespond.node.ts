import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { getAdditionalFields, itemProperties } from '../shared/fields';
import { feedXml, itemXml } from '../shared/rss';

// eslint-disable-next-line @n8n/community-nodes/node-usable-as-tool -- This node completes an HTTP response, not an agent tool call.
export class RssRespond implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RSS Respond',
		name: 'rssRespond',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg, @n8n/community-nodes/icon-validation, @n8n/community-nodes/icon-prefer-themed-variants -- Reuse n8n's built-in RSS icon.
		icon: 'node:rss-read',
		iconColor: 'orange-red',
		group: ['transform'],
		version: 1.1,
		description: 'Build RSS items and respond to an RSS URL request',
		subtitle: 'Return RSS feed',
		defaults: { name: 'RSS Respond' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: itemProperties,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const entryType = this.getNode().type.replace(/\.rssRespond$/, '.rssUrl');
		const entries = this.getParentNodes(this.getNode().name).filter(
			(node) => !node.disabled && node.type === entryType,
		);
		if (entries.length !== 1) {
			throw new NodeOperationError(
				this.getNode(),
				'Connect one RSS URL node upstream',
			);
		}
		const entry = this.getWorkflowDataProxy(0).$items(entries[0].name, 0, 0)[0];
		const records = this.getInputData();
		const xmlItems: string[] = [];
		for (let itemIndex = 0; itemIndex < records.length; itemIndex++) {
			try {
				if (!this.getNodeParameter('includeItem', itemIndex)) continue;
				const item = {
					title: this.getNodeParameter('title', itemIndex),
					link: this.getNodeParameter('link', itemIndex),
					description: this.getNodeParameter('description', itemIndex),
					pubDate: this.getNodeParameter('pubDate', itemIndex),
					additionalFields: getAdditionalFields(
						this.getNodeParameter('additionalFields', itemIndex) as IDataObject,
					),
				};
				xmlItems.push(itemXml(item));
			} catch (error) {
				throw new NodeOperationError(this.getNode(), error as Error, {
					itemIndex,
				});
			}
		}
		const xml = feedXml(entry.json.channel as IDataObject, xmlItems);
		await this.sendResponse({
			body: xml,
			statusCode: 200,
			headers: {
				'content-type': 'application/xml; charset=utf-8',
				'x-content-type-options': 'nosniff',
			},
		});
		return [
			[{ json: { xml }, pairedItem: records.map((_, item) => ({ item })) }],
		];
	}
}
