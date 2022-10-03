
import {
	FileLoader
} from 'three';

import { SceneInfoType } from './objectTypes/SceneInfoType.js';
import { SceneryType } from './objectTypes/SceneryType.js';
import { StaticType } from './objectTypes/StaticType.js';
import { DynamicType } from './objectTypes/DynamicType.js';
import { GroundVehicleType } from './objectTypes/GroundVehicleType.js';

class ModelClassLibrary {

	constructor() {

		this.modelTypes = {
			'sceneInfo': new SceneInfoType(),
			'scenery': new SceneryType(),
			'static': new StaticType(),
			'dynamic': new DynamicType(),
			'groundVehicle': new GroundVehicleType()
		};

		this.modelClasses = null;

	}

	loadClasses( onLoaded ) {

		this.modelClasses = {};

		const scope = this;
		new FileLoader().load( 'ModelClasses/ModelClasses.json', ( modelClassesListJSONText ) => {

			let modelClassesListJSON;

			try {

				modelClassesListJSON = JSON.parse( modelClassesListJSONText );

			}
			catch ( e ) {

				errored( e );
				return;

			}

			function errored( err ) {

				console.error( "Could not parse ModelClasses/ModelClasses.json: " + err );
				onLoaded();

			}

			if ( ! modelClassesListJSON ) {

				errored ( "Unknown error" );
				return;

			}


			const modelClassesList = modelClassesListJSON.classes;
			const numClasses = modelClassesList.length;

			if ( numClasses === 0 ) {

				onLoaded();
				return;

			}

			function loadClass( index ) {

				if ( index >= numClasses ) {

					onLoaded();

				}
				else {

					const className = modelClassesList[ index ];
					const classPath = 'ModelClasses/' + className + '.json';
					new FileLoader().load( classPath, ( classContentsText ) => {

						let classContentsJSON;
						try {

							classContentsJSON = JSON.parse( classContentsText );

						}
						catch ( e ) {

							errored2( e );
							return;

						}

						function errored2( err ) {

							console.error( "Could not parse class definition file '" + classPath + "': " + err );
							onLoaded();

						}

						if ( ! classContentsJSON ) {

							errored2( "Unknown error" );
							return;

						}

						scope.modelClasses[ className ] = classContentsJSON;
						scope.modelClasses[ className ].className = className;

						loadClass( index + 1 );

					} );

				}

			}

			loadClass( 0 );

		} );

	}

	findType( typeName ) {

		return this.modelTypes[ typeName ];

	}

	findClass( className ) {

		return this.modelClasses[ className ];

	}

	createInstance( game, typeName, className, sceneModel, onCreated ) {

		const type = this.findType( typeName );
		if ( ! type ) {

			console.error( "Could not find model type: " + typeName );
			return;

		}

		let jsonData = null;
		if ( className ) {

			const modelClass = this.findClass( className );
			if ( ! modelClass ) {

				console.error( "Could not find model class: " + className );
				return;

			}

			jsonData = modelClass;

		}

		type.createInstance( game, sceneModel, jsonData, ( modelInstance, removed ) => {

			/*
			if ( ! modelInstance ) {

				console.error( "Could not create instance of type: " + typeName + ", class: " + ( className ? className : "<none>" ) );

			}
			*/

			onCreated( modelInstance, removed );

		} );

	}

	getClassNameFromName( name ) {

		// Name of object contains "_class_<nameofclass>_"

		const pos = name.indexOf( "_class_" );

		if ( pos < 0 ) return null;

		const pos2 = pos + "_class_".length;

		const pos3 = name.indexOf( "_", pos2 );

		if ( pos3 < 0 ) return null;

		if ( ( pos3 -  pos2 ) < 1 ) return null;

		return name.substring( pos2, pos3 );

	}

	getClassFromName( name ) {

		return this.findClass( this.getClassNameFromName( name ) );

	}

	createInstanceFromModel( game, model, isRoot, onCreated ) {

		let modelTypeName = null;
		let modelClassName = null;
		let modelClass = null;

		if ( isRoot && model.name.includes( '_scenery_' ) ) modelTypeName = 'scenery';
		else if ( isRoot && model.name.includes( '_static_' ) ) modelTypeName = 'static';
		else {

			modelClassName = this.getClassNameFromName( model.name );

			if ( modelClassName ) {

				modelClass = this.findClass( modelClassName );
				if ( ! modelClass ) {

					console.error( "Could not find model class: " + modelClassName );
					onCreated( false );
					return;

				}

				modelTypeName = modelClass.type;

			}

		}

		if ( modelTypeName ) {

			this.createInstance( game, modelTypeName, modelClassName, model, ( modelInstance, removed ) => {

				onCreated( removed );

			} );

		}
		else {

			let doAdd = false;
			if ( isRoot ) {

				model.traverse ( ( o ) => {

					if ( o.isLight || o.isCamera ) doAdd = true;

				} );

			}

			if ( doAdd ) {

				game.objectsUtils.setObjectShadowProperties( model, modelClass );

				game.scene.attach( model );

			}

			onCreated( doAdd );

		}

	}

}

export { ModelClassLibrary };
