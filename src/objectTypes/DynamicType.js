
import { Avatar } from "../Avatar.js";
import { LDrawUtils } from 'three/addons/utils/LDrawUtils.js';

class DynamicType {

	constructor() {

	}

	createInstance( game, sceneModel, jsonData, onCreated ) {

		game.objectsUtils.loadModel( jsonData.modelPath, ( instance ) => {

			if ( ! instance ) {

				console.error( "Could not load 3D model with path: " + jsonData.modelPath );
				return;

			}

			game.objectsUtils.setObjectShadowProperties( instance, jsonData );

			const lightsAndCameras = [];
			if ( sceneModel ) {

				instance.position.copy( sceneModel.position );
				instance.quaternion.copy( sceneModel.quaternion );
				instance.name = sceneModel.name;

				function traverseModelRecursive( c ) {

					if ( c !== sceneModel && ( c.isLight || c.isCamera ) ) {

						if ( c.parent !== sceneModel && c.parent.children.length === 1 ) {

							lightsAndCameras.push( c.parent );

						}
						else lightsAndCameras.push( c );

					}
					else {

						for ( let i = 0, n = c.children.length; i < n; i ++ ) traverseModelRecursive( c.children[ i ] );

					}

				}

				traverseModelRecursive( sceneModel );

			}

			instance.userData.avatar = new Avatar();
			instance.userData.avatar.object = instance;

			if ( ! game.physics.createPhysicsFromObject( game.scene, instance, jsonData.physicProperties ) ) {

				console.error( "Couldn't create dynamic object of class '" + jsonData.className + "', name: '" + sceneModel.name + "'." );

			}

			for ( let i = 0, n = lightsAndCameras.length; i < n; i ++ ) {

				instance.add( lightsAndCameras[ i ] );

			}

			onCreated( instance, false );

		} );

	}

}

export { DynamicType };
