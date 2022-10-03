import {
	Vector3,
	Color,
	AmbientLight,
	PMREMGenerator,
	PlaneGeometry,
	RepeatWrapping,
	TextureLoader,
	FogExp2
} from 'three';

import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { Water } from 'three/examples/jsm/objects/Water.js';

class EnvironmentBuilder {

	constructor( game, root ) {

		this.game = game;
		this.root = root;

	}

	build( environmentJSON, onBuilt ) {

		if ( ! environmentJSON ) {

			onBuilt();
			return;

		}

		let sun = this.game.objectsUtils.findObjectByNameAndClassProperty( this.root, environmentJSON.sunName, "isDirectionalLight" );

		if ( environmentJSON.sunName && ! sun ) {

			console.error( "Could not find sun light in scene (environment.sunName=" + environmentJSON.sunName + ")" );
			onBuilt();
			return;

		}

		if ( environmentJSON.sunName && ! sun.isDirectionalLight ) {

			console.error( "Sun light in scene must be a directional light (environment.sunName=" + environmentJSON.sunName + ")" );
			onBuilt();
			return;

		}

		if ( environmentJSON.ambientLight ) {

			const al = environmentJSON.ambientLight;
			const ambientLight = new AmbientLight( new Color( al[ 0 ], al[ 1 ], al[ 2 ] ).getHex() );
			this.game.scene.add( ambientLight );

		}

		const scope = this;
		this.createSky( sun, environmentJSON.sky, () => {

			scope.createFog( environmentJSON.fog, () => {

				scope.createSea( sun, environmentJSON.sea, onBuilt );

			} );

		} );

	}

	createSky( sun, skyJSON, onCreated ) {

		if ( ! skyJSON ) {

			onCreated();
			return;

		}

		switch ( skyJSON.type ) {

			case 'color':
				this.game.scene.background = new Color( skyJSON.color[ 0 ], skyJSON.color[ 1 ], skyJSON.color[ 2 ] );
				onCreated();
				break;


			case 'atmosphere':
				this.createAtmosphere( sun, skyJSON );
				onCreated();
				break;

			default:
				console.error( "Unrecognized sky.type: '" + skyJSON.type + "'." );
				onCreated();
				break;
		}

	}

	createFog( fogJSON, onCreated ) {

		if ( ! fogJSON ) {

			onCreated();
			return;

		}

		if ( ! fogJSON.fogColor ) {

			console.error( "createFog: Missing fog.fogColor" );
			onCreated();
			return;

		}

		const fogColor = new Color( fogJSON.fogColor[ 0 ], fogJSON.fogColor[ 1 ], fogJSON.fogColor[ 2 ] );
		this.game.scene.background = fogColor;
		this.game.scene.fog = new FogExp2( fogColor.getHex(), fogJSON.fogConstant );

		onCreated();

	}

	createSea( sun, seaJSON, onCreated ) {

		if ( ! seaJSON ) {

			onCreated();
			return;

		}

		if ( ! sun ) {

			console.error( "createAtmosphere: No sun was defined." );
			return;

		}

		function checkParam( param ) {

			if ( ! param ) {

				console.error( "createSea: Missing environment.sea." + param + " parameter." );
				return false;

			}

			return true;

		}

		if ( ! checkParam( 'waterSideLength' ) ) return;

		let waterColor;
		if ( seaJSON.waterColor ) waterColor = new Color( seaJSON.waterColor.x, seaJSON.waterColor.y, seaJSON.waterColor.z ).getHex()
		else waterColor = 0x001e0f;

		const waterGeometry = new PlaneGeometry( seaJSON.waterSideLength, seaJSON.waterSideLength, 4, 4 );
		const water = new Water(
			waterGeometry,
			{
				textureWidth: 512,
				textureHeight: 512,
				waterNormals: new TextureLoader().load( 'textures/waternormals.jpg', function ( texture ) {

					texture.wrapS = texture.wrapT = RepeatWrapping;

				} ),
				sunDirection: new Vector3(),
				sunColor: sun.color.getHex(),
				waterColor: waterColor,
				distortionScale: 3.7,
				fog: this.game.scene.fog !== undefined
			}
		);

		water.rotation.x = - Math.PI / 2;

		function updateWater() {

			water.material.uniforms[ 'sunDirection' ].value.copy( sun.position ).normalize();

		}

		updateWater();

		this.game.actuators.push( {
			actuate: ( deltaTime, time ) => {

				water.material.uniforms[ 'time' ].value = time;

			},
			isDestroyed: () => { return false; },
		} );

		this.game.scene.add( water );

		onCreated();

	}

	createAtmosphere( sun, skyJSON ) {

		if ( ! skyJSON ) {

			onCreated();
			return;

		}

		if ( ! sun ) {

			console.error( "createAtmosphere: No sun was defined." );
			onCreated();
			return;

		}

		const sky = new Sky();
		sky.scale.setScalar( 10000 );
		this.game.scene.add( sky );
		var skyUniforms = sky.material.uniforms;
		skyUniforms[ 'turbidity' ].value = 10;
		skyUniforms[ 'rayleigh' ].value = 2;
		skyUniforms[ 'mieCoefficient' ].value = 0.005;
		skyUniforms[ 'mieDirectionalG' ].value = 0.8;

		const pmremGenerator = new PMREMGenerator( this.game.renderer );
		let renderTarget;

		const scope = this;
		function updateSun() {

			//const sunPosition = new Vector3( 10, 0.05, 0.1 ).normalize();
			const sunPosition = new Vector3().copy( sun.position ).normalize();
			sky.material.uniforms[ 'sunPosition' ].value.copy( sunPosition );

			if ( renderTarget !== undefined ) renderTarget.dispose();

			renderTarget = pmremGenerator.fromScene( sky );

			scope.game.scene.environment = renderTarget.texture;

		}

		updateSun();

		onCreated();

	}

}

export { EnvironmentBuilder };
