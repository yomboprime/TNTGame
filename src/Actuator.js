
class Actuator {

	constructor( game ) {

		this.game = game;
		this.active = false;
		this.object = null;

	}

	addToObject( object ) {

		if ( this.game.actuators.indexOf( this ) < 0 ) this.game.actuators.push( this );
		this.object = object;

	}

	removeFromObject() {

		const i = this.game.actuators.indexOf( this );
		if ( i >= 0 ) this.game.actuators.splice( i, 1 );

		this.object = null;

	}

	actuate( deltaTime, time ) { }

	isDestroyed() {

		return false;

	}

}

export { Actuator };
