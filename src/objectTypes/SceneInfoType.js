import {
	Vector3
} from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { EnvironmentBuilder } from '../EnvironmentBuilder.js';

class SceneInfoType {

	constructor() {}

	createInstance( game, sceneModel, jsonData, onCreated ) {

		const scope = this;

		game.shadowsEnabled = jsonData.shadowsEnabled;

		if ( jsonData.gravity !== undefined ) game.physics.setGravity( jsonData.gravity );

		let root = sceneModel;
		while ( root.parent ) root = root.parent;
		const environmentBuilder = new EnvironmentBuilder( game, root );
		environmentBuilder.build( jsonData.environment, () => {

			if ( jsonData.players ) {

				if ( jsonData.players.length >= 1 && jsonData.players[ 0 ].avatar ) {

					game.actuators.push( {
						actuate: () => {

							const avatarInstance = game.objectsUtils.findObjectByName( game.scene, jsonData.players[ 0 ].avatar );
							const avatar = avatarInstance ? avatarInstance.userData.avatar : null;
							if ( avatar ) avatar.possessBy( game.player );

						},
						isDestroyed: () => { return true; }
					} );

				}

			}

			if ( jsonData.cameras ) {

				// One-shot actuator
				game.actuators.push( {
					actuate: () => {

						for ( let i = 0, n = jsonData.cameras.length; i < n; i ++ ) {

							const cameraJson = jsonData.cameras[ i ];

							const camera = game.objectsUtils.findObjectByNameAndClassProperty( game.scene, cameraJson.name, 'isCamera' );
							if ( ! camera ) {

								console.error( "Could not find camera with name '" + cameraJson.name + "'. Ignoring it." );
								continue;

							}

							game.cameras.push( camera );

							if ( cameraJson.orbit ) {

								const orbitedObject = game.objectsUtils.findObjectByName( game.scene, cameraJson.orbit );
								if ( ! orbitedObject ) {

									console.error( "Creating camera with name: '" + cameraJson.name + "', orbited object '" + cameraJson.orbit + "' not found." );
									continue;

								}
								scope.createOrbitController( game, camera, orbitedObject );

							}

							if ( cameraJson.lookAt ) {

								if ( cameraJson.orbit ) {

									console.error( "Creating camera with name: '" + cameraJson.name + "', cannot use 'orbit' and 'lookAt' at the same time. Ignoring 'lookAt'." );
									continue;

								}

								const targetObject = game.objectsUtils.findObjectByName( game.scene, cameraJson.lookAt );
								if ( ! targetObject ) {

									console.error( "Creating camera with name: '" + cameraJson.name + "', target object '" + cameraJson.lookAt + "' not found." );
									continue;

								}

								scope.createLookAtController( game, camera, targetObject );

							}

						}

						if ( game.cameras.length > 0 ) game.setCamera( game.cameras[ 0 ] );

					},
					isDestroyed: () => { return true; }
				} );

			}

			onCreated( null, false );

		} );

	}

	createOrbitController( game, camera, object ) {

		let orbitControls = null;
		const lastTarget = new Vector3();
		const tempVec1 = new Vector3();
		game.actuators.push( {
			actuate: () => {

				if ( ! orbitControls ) {

					orbitControls = new OrbitControls( camera, game.renderer.domElement );
					game.scene.attach( camera );
					lastTarget.copy( object.position );

				}

				tempVec1.subVectors( object.position, lastTarget );
				camera.position.add( tempVec1 );
				orbitControls.target.copy( object.position );
				orbitControls.update();
				lastTarget.copy( object.position );


			},

			isDestroyed: () => { return false; }

		} );

	}

	createLookAtController( game, camera, targetObject ) {

		let inited = false;
		const tempVec1 = new Vector3();
		game.actuators.push( {
			actuate: () => {

				if ( ! inited ) {

					game.scene.attach( camera );
					inited = true;

				}

				targetObject.getWorldPosition( tempVec1 );
				camera.lookAt( tempVec1 );

			},

			isDestroyed: () => { return false; }

		} );

	}
}

export { SceneInfoType };
