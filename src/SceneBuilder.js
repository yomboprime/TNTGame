import {
	Vector3,
	Quaternion,
	Mesh,
	BoxGeometry
} from 'three';

import { ObjectsUtils } from './ObjectsUtils.js';


class SceneBuilder {

	constructor( game ) {

		this.game = game;

	}

	build( sceneFilePath, onBuilt ) {

		this.game.objectsUtils.loadGLB( sceneFilePath, ( sceneModel ) => {

			this.processSceneModel( sceneModel, onBuilt );

		} );

	}

	processSceneModel( sceneModel, onProcessed ) {

		// Put sceneModel object, if any, at the start.
		for ( let i = 0, il = sceneModel.children.length; i < il; i ++ ) {

			const child = sceneModel.children[ i ];
			const objectClass = this.game.modelClassLibrary.getClassFromName( child.name );
			if ( objectClass && objectClass.type === 'sceneInfo' ) {

				sceneModel.children.splice( i, 1 );
				sceneModel.children.unshift( child );
				break;

			}

		}

		const scope = this;
		function processSceneModelInternal( index ) {

			if ( index >= sceneModel.children.length ) onProcessed();
			else {

				scope.processRootModel( sceneModel.children[ index ], ( removed ) => {

					processSceneModelInternal( removed ? index : index + 1 );

				} );

			}

		}

		processSceneModelInternal( 0 );

	}

	processRootModel( model, onProcessed ) {

		this.game.modelClassLibrary.createInstanceFromModel( this.game, model, true, onProcessed );

	}

}

export { SceneBuilder };
