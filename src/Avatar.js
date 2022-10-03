
class Avatar {

	constructor() {

		this.player = null;
		this.object = null;

	}

	possessBy( player ) {

		this.unpossess();
		if ( player.avatar ) player.avatar.unpossess();

		player.avatar = this;
		this.player = player;

	}

	unpossess() {

		if ( this.player ) this.player.avatar = null;
		this.player = null;

	}

	getController() {

		if ( ! this.player ) return null;
		return this.player.controller;

	}

}

export { Avatar };
