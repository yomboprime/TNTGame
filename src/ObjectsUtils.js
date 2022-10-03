import {
	Vector3
} from 'three';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { LDrawLoader } from 'three/examples/jsm/loaders/LDrawLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

class ObjectsUtils {

	constructor( game ) {

		this.game = game;

		this.tempVec1 = new Vector3();

	}

	getFilenameExtension( path ) {

		path = path || "";

		const pathLastIndexOfDot = path.lastIndexOf( "." );

		if ( pathLastIndexOfDot > 0 && path.length > pathLastIndexOfDot + 1) {

			return path.substring( pathLastIndexOfDot + 1 );

		}
		else return "";

	}


	isGLBExtension( extension ) {

		return extension === 'glb';

	}

	isDAEExtension( extension ) {

		return extension === 'dae';

	}

	isLDrawExtension( extension ) {

		return [
			'ldraw',
			'dat',
			'mpd'
		].includes( extension );

	}

	loadModel( path, onLoaded ) {

		const extensionLowercase = this.getFilenameExtension( path ).toLowerCase();

		if ( this.isGLBExtension( extensionLowercase ) ) this.loadGLB( path, onLoaded );
		else if ( this.isDAEExtension( extensionLowercase ) ) this.loadDAE( path, onLoaded );
		else if ( this.isLDrawExtension( extensionLowercase ) ) this.loadLDraw( path, onLoaded );
		else onLoaded( null );

	}

	loadGLB( path, onLoaded ) {

		new GLTFLoader().load( path, function ( gltf ) {

			const object = gltf.scene;
			onLoaded( object );

		}, undefined, ( error ) => {

			console.error( error );

		} );

	}

	loadDAE( path, onLoaded ) {

		new ColladaLoader().load( path, function ( dae ) {

			const object = dae.scene;
			onLoaded( object );

		}, undefined, ( error ) => {

			console.error( error );

		} );

	}

	loadLDraw( path, onLoaded ) {

		const loader = new LDrawLoader();
		loader.smoothNormals = false;

		loader.load( path, function ( ldraw ) {

			const object = ldraw;
			onLoaded( object );

		}, undefined, ( error ) => {

			console.error( error );

		} );

	}

	loadOBJ( path, objFilename, onLoaded ) {

		new OBJLoader()
		.setPath( path )
		.load( objFilename, function ( object ) {

			onLoaded( object );

		} );

	}

	loadOBJMTL( path, objFilename, onLoaded ) {

		const mtlFilename = objFilename.substring( 0, objFilename.lastIndexOf( '.' ) ) + '.mtl';

		new MTLLoader()
		.setPath( path )
		.load( mtlFilename, function ( materials ) {

			materials.preload();

			new OBJLoader()
			.setMaterials( materials )
			.setPath( path )
			.load( objFilename, function ( object ) {

				onLoaded( object );

			} );

		} );

	}

	setObjectShadowProperties( instance, modelClass ) {

		if ( this.game.shadowsEnabled ) {

			let shadowSize = 10;
			let shadowResolution = 512;
			let normalBias = 0.05;
			if ( modelClass ) {

				if ( modelClass.shadowSize ) shadowSize = modelClass.shadowSize;
				if ( modelClass.shadowResolution ) shadowResolution = modelClass.shadowResolution;
				if ( modelClass.normalBias ) normalBias = modelClass.normalBias;

			}

			instance.traverse ( ( o ) => {

				if ( o.isLight ) {

					o.castShadow = true;
					o.shadow.normalBias = normalBias;
					o.shadow.mapSize.set( shadowResolution, shadowResolution );

					if ( o.isDirectionalLight ) {

						o.shadow.camera.left = - shadowSize;
						o.shadow.camera.right = shadowSize;
						o.shadow.camera.bottom = - shadowSize;
						o.shadow.camera.top = shadowSize;

					}

				}
				else if ( o.isMesh ) {

					o.castShadow = true;
					o.receiveShadow = true;

				}

			} );

		}

	}

	centerModelGeometry( object ) {

		const tempVec1 = this.tempVec1;
		object.geometry.boundingBox.getCenter( tempVec1 );
		object.position.add( tempVec1 );
		object.geometry.translate( - tempVec1.x, - tempVec1.y, - tempVec1.z );

		for ( let i = 0, n = object.children.length; i < n; i ++ ) {

			object.children[ i ].position.sub( tempVec1 );

		}

	}

	findObjectByName( root, name ) {

		return root.getObjectByName( name );

	}

	findObjectByNameAndClassProperty( root, name, classProperty ) {

		// classProperty is e.g. "isCamera", "isDirectionalLight"

		const object = this.findObjectByName( root, name );

		if ( ! object ) return null;

		if ( object[ classProperty ] ) return object;

		if ( object.children.length === 1 && object.children[ 0 ][ classProperty ] ) return object.children[ 0 ];

		return null;

	}

}

export { ObjectsUtils };
