import { Meteor } from 'meteor/meteor';

import { setUserAvatar, checkUsernameAvailability, deleteUser } from '../../../lib/server/functions';
import { Users } from '../../../models';


export class AppUserBridge {
	constructor(orch) {
		this.orch = orch;
	}

	async getById(userId, appId) {
		this.orch.debugLog(`The App ${ appId } is getting the userId: "${ userId }"`);

		return this.orch.getConverters().get('users').convertById(userId);
	}

	async getByUsername(username, appId) {
		this.orch.debugLog(`The App ${ appId } is getting the username: "${ username }"`);

		return this.orch.getConverters().get('users').convertByUsername(username);
	}

	async create(user, appId, { avatarUrl }) {
		this.orch.debugLog(`The App ${ appId } is requesting to create a new user.`);

		const { type } = user;
		let newUserId;

		switch (type) {
			case 'app':
				if (!checkUsernameAvailability(user.username)) {
					console.error(`A user with the App's username ${ user.username } has already existed, please rename or delete that user before installing the App.`);
					return;
				}

				Users.update({ _id: user._id }, { ...user, active: true }, { upsert: true });

				if (avatarUrl) {
					Meteor.runAsUser(user._id, () => setUserAvatar(user, avatarUrl, '', 'local'));
				}
				newUserId = user._id;
				break;
			default:
				throw new Meteor.Error('error-creating-users-not-supported', 'Creating users is not supported now!', { function: 'create' });
		}

		return newUserId;
	}

	async removeAppUser(appId) {
		this.orch.debugLog(`The App's user is being removed: ${ appId }`);

		const user = Users.findOne({ appId });

		// It's actually not a problem if there is no App user to delete - just means we don't need to do anything more.
		if (!user) {
			return true;
		}

		try {
			deleteUser(user.id);
		} catch (err) {
			throw new Meteor.Error('error-deleting-user', `Errors occurred while deleting an app user: ${ err }`, { function: 'removeAppUser' });
		}

		return true;
	}

	async getActiveUserCount() {
		return Users.getActiveLocalUserCount();
	}
}
