import type { IDataObject, INodeProperties } from 'n8n-workflow';

const text = (displayName: string, name: string): INodeProperties => ({
	displayName,
	name,
	type: 'string',
	default: '',
});
const date = (displayName: string, name: string): INodeProperties => ({
	displayName,
	name,
	type: 'dateTime',
	default: '',
	description: 'Converted to the RSS date format with a GMT timezone',
});
const requiredText = (displayName: string, name: string): INodeProperties => ({
	...text(displayName, name),
	required: true,
});
const email = (displayName: string, name: string): INodeProperties => ({
	...text(displayName, name),
	placeholder: 'editor@example.com (Editor Name)',
	description: 'Email address, optionally followed by a name in parentheses',
});
const url = (displayName: string, name: string): INodeProperties => ({
	...text(displayName, name),
	placeholder: 'https://example.com',
});
const weekdays = [
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
	'Sunday',
];
const group = (
	displayName: string,
	name: string,
	values: INodeProperties[],
): INodeProperties => ({
	displayName,
	name,
	type: 'fixedCollection',
	typeOptions: { multipleValues: false },
	default: { fields: {} },
	placeholder: `Add ${displayName}`,
	options: [{ displayName, name: 'fields', values }],
});
const categories: INodeProperties = {
	displayName: 'Categories',
	name: 'categories',
	type: 'fixedCollection',
	typeOptions: { multipleValues: true },
	default: {},
	placeholder: 'Add Category',
	options: [
		{
			displayName: 'Category',
			name: 'entries',
			values: [
				requiredText('Category', 'value'),
				{
					...text('Domain', 'domain'),
					description: 'Optional identifier of the category taxonomy',
				},
			],
		},
	],
};

export const getChannelProperties = (): INodeProperties[] => [
	{ ...text('Title', 'title'), required: true },
	{
		...url('Link', 'link'),
		required: true,
	},
	{
		...text('Description', 'description'),
		required: true,
		typeOptions: { rows: 3 },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			categories,
			group('Cloud', 'cloud', [
				{ ...requiredText('Domain', 'domain'), placeholder: 'rpc.example.com' },
				{
					displayName: 'Port',
					name: 'port',
					type: 'number',
					default: 80,
					required: true,
					typeOptions: { minValue: 1, maxValue: 65535 },
				},
				{ ...requiredText('Path', 'path'), placeholder: '/rpc' },
				requiredText('Register Procedure', 'registerProcedure'),
				{
					displayName: 'Protocol',
					name: 'protocol',
					type: 'options',
					default: 'xml-rpc',
					options: [
						{ name: 'HTTP POST', value: 'http-post' },
						{ name: 'SOAP', value: 'soap' },
						{ name: 'XML-RPC', value: 'xml-rpc' },
					],
				},
			]),
			text('Copyright', 'copyright'),
			{
				...url('Docs', 'docs'),
				description: 'URL of the RSS format specification',
			},
			text('Generator', 'generator'),
			group('Image', 'image', [
				{ ...url('URL', 'url'), required: true },
				requiredText('Title', 'title'),
				{ ...url('Link', 'link'), required: true },
				{
					displayName: 'Width',
					name: 'width',
					type: 'number',
					default: 88,
					typeOptions: { minValue: 1, maxValue: 144 },
				},
				{
					displayName: 'Height',
					name: 'height',
					type: 'number',
					default: 31,
					typeOptions: { minValue: 1, maxValue: 400 },
				},
				text('Description', 'description'),
			]),
			{
				...text('Language', 'language'),
				placeholder: 'en-us',
				description: 'Language code for the channel, such as en-us or zh-cn',
			},
			date('Last Build Date', 'lastBuildDate'),
			email('Managing Editor', 'managingEditor'),
			date('Publication Date', 'pubDate'),
			text('Rating', 'rating'),
			{
				displayName: 'Skip Days',
				name: 'skipDays',
				type: 'multiOptions',
				default: [],
				options: weekdays.map((day) => ({ name: day, value: day })),
				description: 'Days when aggregators may skip refreshing the feed (GMT)',
			},
			{
				displayName: 'Skip Hours',
				name: 'skipHours',
				type: 'multiOptions',
				default: [],
				options: Array.from({ length: 24 }, (_, hour) => ({
					name: String(hour),
					value: hour,
				})),
				description:
					'Hours when aggregators may skip refreshing the feed (GMT, 0–23)',
			},
			group('Text Input', 'textInput', [
				requiredText('Title', 'title'),
				requiredText('Description', 'description'),
				{
					...requiredText('Name', 'name'),
					description:
						'Name of the query parameter submitted by the text input',
				},
				{ ...url('Link', 'link'), required: true },
			]),
			{
				displayName: 'TTL',
				name: 'ttl',
				type: 'number',
				default: 60,
				typeOptions: { minValue: 0 },
				description: 'Time to live in minutes',
			},
			email('Webmaster', 'webMaster'),
		],
	},
];

const getItemProperties = (): INodeProperties[] => [
	{
		...text('Title', 'title'),
		default: '',
		placeholder: 'Article title',
		description: 'Item title. Provide a title or description.',
	},
	url('Link', 'link'),
	{
		...text('Description', 'description'),
		typeOptions: { rows: 3 },
		description:
			'Item summary or HTML content. Provide a title or description.',
	},
	date('Publication Date', 'pubDate'),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			email('Author', 'author'),
			categories,
			{
				...url('Comments', 'comments'),
				description: 'URL of the page for comments on this item',
			},
			group('Enclosure', 'enclosure', [
				{ ...url('URL', 'url'), required: true },
				{
					displayName: 'Length (Bytes)',
					name: 'length',
					required: true,
					type: 'number',
					default: 0,
					typeOptions: { minValue: 0 },
					description: 'Size in bytes',
				},
				{
					...requiredText('MIME Type', 'type'),
					placeholder: 'audio/mpeg',
					description: 'MIME type of the attachment',
				},
			]),
			group('GUID', 'guid', [
				{
					...requiredText('Value', 'value'),
					description:
						'Stable identifier for this item. Use a full URL when Is PermaLink is enabled.',
				},
				{
					displayName: 'Is PermaLink',
					name: 'isPermaLink',
					type: 'boolean',
					default: true,
					description: 'Whether the GUID is a permanent URL',
				},
			]),
			group('Source', 'source', [
				requiredText('Title', 'title'),
				{ ...url('URL', 'url'), required: true },
			]),
		],
	},
];

export const channelProperties = getChannelProperties();

export const itemProperties: INodeProperties[] = [
	{
		displayName: 'Include Item',
		name: 'includeItem',
		type: 'boolean',
		default: true,
		description: 'Whether to include this input item in the feed',
	},
	...getItemProperties(),
];

export function getAdditionalFields(data: IDataObject): IDataObject {
	const result = { ...data };
	for (const name of [
		'cloud',
		'image',
		'textInput',
		'enclosure',
		'guid',
		'source',
	]) {
		if (result[name] !== undefined) {
			const group = result[name] as IDataObject;
			if (group.fields === undefined) delete result[name];
			else result[name] = group.fields;
		}
	}
	return result;
}
