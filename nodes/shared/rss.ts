import type { IDataObject } from 'n8n-workflow';

function escapeXml(value: string): string {
	for (const character of value) {
		const point = character.codePointAt(0)!;
		if (
			(point < 32 && point !== 9 && point !== 10 && point !== 13) ||
			(point >= 0xd800 && point <= 0xdfff) ||
			point === 0xfffe ||
			point === 0xffff
		) {
			throw new Error(
				'Text contains a character that is not allowed in XML 1.0',
			);
		}
	}
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function value(data: IDataObject, key: string): string {
	const result = data[key];
	if (result === undefined || result === null || result === '') return '';
	if (
		typeof result !== 'string' &&
		typeof result !== 'number' &&
		typeof result !== 'boolean'
	) {
		throw new Error(`${key} must be a text, number, or boolean value`);
	}
	return String(result);
}

function required(data: IDataObject, key: string): string {
	const result = value(data, key);
	if (!result.trim()) throw new Error(`${key} is required`);
	return result;
}

function element(name: string, content: string): string {
	if (
		name === 'link' ||
		name === 'url' ||
		name === 'comments' ||
		name === 'docs'
	) {
		absoluteUrl(content, name);
	}
	return `<${name}>${escapeXml(content)}</${name}>`;
}

function absoluteUrl(content: string, name: string): void {
	try {
		new URL(content);
	} catch {
		// eslint-disable-next-line @n8n/community-nodes/require-node-api-error -- Pure serializer errors are wrapped with node context by the caller.
		throw new Error(`${name} must be an absolute URL`);
	}
}

function integer(
	data: IDataObject,
	name: string,
	min: number,
	max = Number.MAX_SAFE_INTEGER,
): number {
	const result = Number(required(data, name));
	if (!Number.isSafeInteger(result) || result < min || result > max) {
		throw new Error(`${name} must be an integer between ${min} and ${max}`);
	}
	return result;
}

function elements(data: IDataObject, names: string[]): string {
	return names
		.map((name) => {
			let content = value(data, name);
			if (!content) return '';
			if (
				['author', 'managingEditor', 'webMaster'].includes(name) &&
				!/^[^\s@]+@[^\s@]+(?:\s+\([^\r\n]+\))?$/.test(content)
			) {
				throw new Error(
					`${name} must be an email address, optionally followed by a name in parentheses`,
				);
			}
			if (name === 'pubDate' || name === 'lastBuildDate') {
				const parsed = new Date(content);
				if (!Number.isFinite(parsed.getTime()))
					throw new Error(`${name} must be a valid date`);
				content = parsed.toUTCString();
			}
			return element(name, content);
		})
		.join('');
}

function categories(data: IDataObject): string {
	const entries =
		(data.categories as { entries?: IDataObject[] } | undefined)?.entries ?? [];
	return entries
		.map((entry) => {
			const domain = value(entry, 'domain');
			return `<category${domain ? ` domain="${escapeXml(domain)}"` : ''}>${escapeXml(required(entry, 'value'))}</category>`;
		})
		.join('');
}

export function channelXml(channel: IDataObject): string {
	const extra = (channel.additionalFields ?? {}) as IDataObject;
	if (value(extra, 'ttl')) integer(extra, 'ttl', 0);
	let xml = ['title', 'link', 'description']
		.map((key) => element(key, required(channel, key)))
		.join('');
	xml +=
		elements(extra, [
			'language',
			'copyright',
			'managingEditor',
			'webMaster',
			'pubDate',
			'lastBuildDate',
			'generator',
			'docs',
			'ttl',
			'rating',
		]) + categories(extra);
	const image = extra.image as IDataObject | undefined;
	if (image) {
		if (value(image, 'width')) integer(image, 'width', 1, 144);
		if (value(image, 'height')) integer(image, 'height', 1, 400);
		xml +=
			'<image>' +
			['url', 'title', 'link']
				.map((key) => element(key, required(image, key)))
				.join('') +
			elements(image, ['width', 'height', 'description']) +
			'</image>';
	}
	const cloud = extra.cloud as IDataObject | undefined;
	if (cloud) {
		if (
			!['xml-rpc', 'soap', 'http-post'].includes(required(cloud, 'protocol'))
		) {
			throw new Error('Cloud protocol must be xml-rpc, soap, or http-post');
		}
		integer(cloud, 'port', 1, 65535);
		xml +=
			'<cloud' +
			['domain', 'port', 'path', 'registerProcedure', 'protocol']
				.map((name) => ` ${name}="${escapeXml(required(cloud, name))}"`)
				.join('') +
			'/>';
	}
	const textInput = extra.textInput as IDataObject | undefined;
	if (textInput)
		xml +=
			'<textInput>' +
			['title', 'description', 'name', 'link']
				.map((name) => element(name, required(textInput, name)))
				.join('') +
			'</textInput>';
	const hours = (extra.skipHours ?? []) as number[];
	if (hours.length) {
		if (
			hours.length > 24 ||
			hours.some((hour) => !Number.isInteger(hour) || hour < 0 || hour > 23)
		) {
			throw new Error(
				'Skip hours must contain up to 24 GMT hours from 0 to 23',
			);
		}
		xml +=
			'<skipHours>' +
			hours.map((hour) => element('hour', String(hour))).join('') +
			'</skipHours>';
	}
	const days = (extra.skipDays ?? []) as string[];
	if (days.length) {
		if (
			days.length > 7 ||
			days.some(
				(day) =>
					![
						'Monday',
						'Tuesday',
						'Wednesday',
						'Thursday',
						'Friday',
						'Saturday',
						'Sunday',
					].includes(day),
			)
		) {
			throw new Error(
				'Skip days must contain up to seven English weekday names',
			);
		}
		xml +=
			'<skipDays>' +
			days.map((day) => element('day', day)).join('') +
			'</skipDays>';
	}
	return xml;
}

export function itemXml(item: IDataObject): string {
	if (!value(item, 'title').trim() && !value(item, 'description').trim()) {
		throw new Error('Each RSS item needs a title or description');
	}
	const extra = (item.additionalFields ?? {}) as IDataObject;
	let xml =
		elements(item, ['title', 'link', 'description', 'pubDate']) +
		elements(extra, ['author', 'comments']) +
		categories(extra);
	const guid = extra.guid as IDataObject | undefined;
	if (guid) {
		if (guid.isPermaLink !== false)
			absoluteUrl(required(guid, 'value'), 'GUID permalink');
		xml += `<guid isPermaLink="${guid.isPermaLink === false ? 'false' : 'true'}">${escapeXml(required(guid, 'value'))}</guid>`;
	}
	const enclosure = extra.enclosure as IDataObject | undefined;
	if (enclosure) {
		const length = integer(enclosure, 'length', 0);
		const url = new URL(required(enclosure, 'url'));
		if (!['http:', 'https:'].includes(url.protocol))
			throw new Error('Enclosure URL must use HTTP or HTTPS');
		if (!/^[^\s/]+\/[^\s/]+$/.test(required(enclosure, 'type')))
			throw new Error('Enclosure type must be a MIME type');
		xml += `<enclosure url="${escapeXml(required(enclosure, 'url'))}" length="${length}" type="${escapeXml(required(enclosure, 'type'))}"/>`;
	}
	const source = extra.source as IDataObject | undefined;
	if (source) {
		absoluteUrl(required(source, 'url'), 'Source URL');
		xml += `<source url="${escapeXml(required(source, 'url'))}">${escapeXml(required(source, 'title'))}</source>`;
	}
	return `<item>${xml}</item>`;
}

export function feedXml(channel: IDataObject, items: string[]): string {
	return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>${channelXml(channel)}${items.join('')}</channel></rss>`;
}
