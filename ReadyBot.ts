import {
	Discord,
	On,
	Client,
} from '@typeit/discord';
import {
	Message, User,
} from 'discord.js';
import { COMMAND_NOT_FOUND, COMMANDS } from './utils';

interface ReadyUser extends User {
	ready: boolean;
}

let PREFIX = '!!';

@Discord
export class DiscordReadyBot {
	private static _client: Client;

	checking = false;
	readyMembers: ReadyUser[] = [];
	initMember: User;

	static start() {
		this._client = new Client();
		this._client.login(process.env.BOT_TOKEN);
	}

	@On('ready')
	onReady() {
		console.log(`Logged in as ${DiscordReadyBot._client.user.tag}!`);
	}

	@On('message')
	async onMessage(message: Message) {
		const {content, channel, author} = message;

		// ignore non-commands
		if (!content.startsWith(PREFIX)) {
			return;
		}
		const withoutPrefix = content.slice(PREFIX.length);
		const split = withoutPrefix.split(/ +/);
		const command = split[0].toLowerCase();
		const args = split.slice(1);

		// don't listen to yourself, cunt
		if (DiscordReadyBot._client.user.id !== message.author.id) {

			switch (command) {
				case COMMANDS.INIT_CHECK_CMD:
					// calling init multiple times resets last check
					this.checking = true;
					this.initMember = author;
					this.readyMembers = [];

					for (let arg of args) {
						this.readyMembers.push(this.getUserFromMention(arg) as ReadyUser);
					}

					if (this.readyMembers.length === 0) {
						message.reply('Check active. Add the users now! Type !add <users>');
					} else {
						channel.send(`Check active. Waiting for ${this.getUnreadyUserMentions()} to ready up!`);
					}

					break;
				case COMMANDS.CHECK_READY_CMD:
					if (this.checking) {
						const unready = this.readyMembers.filter(user => !user.ready);
						if (unready.length !== 0) {
							channel.send(`Waiting for ${this.getUnreadyUserMentions()} to ready up! CUNTS!!!`);
						} else {
							channel.send(`✅ ✅ ✅ Everyone is ready! Let's go`);
						}

					} else {
						message.reply('No check active!');
					}
					break;
				case COMMANDS.ADD_CMD:
					if (this.checking) {
						for (let arg of args) {
							this.readyMembers.push(this.getUserFromMention(arg) as ReadyUser);
						}
						channel.send(`Users updated. Waiting for ${this.getUnreadyUserMentions()} to ready up!`);
					} else {
						message.reply('No check active!');
					}
					break;
				case COMMANDS.REMOVE_CMD:
					if (this.checking) {
						for (let arg of args) {
							const removeUser = this.getUserFromMention(arg) as ReadyUser;
							this.readyMembers = this.readyMembers.filter(user => user.id !== removeUser.id);
						}

						channel.send(`Users updated. Waiting for ${this.getUnreadyUserMentions()} to ready up!`);
					} else {
						message.reply('No check active!');
					}
					break;
				case COMMANDS.READY_CMD:
					if (this.checking) {
						const user = this.readyMembers.find(user => user.id === author.id);
						if (user) {
							user.ready = true;
							message.react('✅');

							// last dude readied up, notify owner
							const unready = this.readyMembers.filter(user => !user.ready);
							if (unready.length === 0) {
								channel.send(`✅ ✅ ✅ Everyone is ready! ${this.initMember}Let's go`);
							}

						} else {
							message.reply('You are not part of this check!');
						}
					} else {
						message.reply('No check active!');
					}
					break;
				case COMMANDS.UNREADY_CMD:
					if (this.checking) {
						const user = this.readyMembers.find(user => user.id === author.id);
						if (user) {
							user.ready = false;
							message.react('💩');
						} else {
							message.reply('You are not part of this check!');
						}
					} else {
						message.reply('No check active!');
					}
					break;
				case COMMANDS.CHANGE_PREFIX_CMD:
					PREFIX = args[0];
					channel.send(`Prefix changed to ${args[0]}`);

					break;
				default:
					message.reply(COMMAND_NOT_FOUND);
					break;
			}
		}
	}

	getUnreadyUserMentions(): string {
		if (!this.readyMembers) {
			return '';
		}
		let tmp = '';
		for (let member of this.readyMembers.filter(user => !user.ready)) {
			tmp += ` <@${member.id}>,`;
		}

		tmp = tmp.slice(1); // remove first " "
		tmp = tmp.substring(0, tmp.length - 1); // remove last ","
		return tmp;
	}

	getUserFromMention(mention): User {
		if (!mention) return;

		if (mention.startsWith('<@') && mention.endsWith('>')) {
			mention = mention.slice(2, -1);

			if (mention.startsWith('!')) {
				mention = mention.slice(1);
			}

			return DiscordReadyBot._client.users.get(mention);
		}
	}
}

