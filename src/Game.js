import {
	Vector3,
	Color,
	Plane,
	Quaternion,
	PerspectiveCamera,
	Mesh,
	Group,
	AmbientLight,
	PointLight,
	MathUtils,
	MeshLambertMaterial,
	BufferGeometry,
	BoxGeometry,
	Scene,
	AudioListener,
	Audio,
	AudioLoader
} from 'three';

import { ConvexObjectBreaker } from 'three/examples/jsm/misc/ConvexObjectBreaker.js';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';

import { Physics } from './Physics.js';
import { ModelClassLibrary } from './ModelClassLibrary.js';
import { SceneBuilder } from './SceneBuilder.js';
import { ObjectsUtils } from './ObjectsUtils.js';
import { Controller } from './Controller.js';
import { Player } from './Player.js';



class Game {

	constructor() {

		// Default parameters

		this.shadowsEnabled = false;

	}

	init( renderer, Ammo, onInited ) {

		this.renderer = renderer;

		this.scene = new Scene();
		this.scene.background = new Color( 0x4f6fff );

		// Default camera overriden by the scene cameras
		this.camera = new PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 10000 );
		this.camera.position.set( 0, 10, 20 );

		// Physics variables
		this.Ammo = Ammo;
		this.physics = new Physics( this.Ammo );
		this.physics.init();

		this.actuators = [];
		this.vehicles = [];
		this.cameras = [];

		//this.listener = new AudioListener();
		//this.camera.add( this.listener );

		this.time = 0;

		this.controller = new Controller();
		this.player = new Player();
		this.player.controller = this.controller;

		this.enterExitPressed = false;


		// Sounds
		/*
		this.sounds = {};

		const scope = this;
		const audioLoader = new AudioLoader();

		function loadSound( path ) {

			const sound = new Audio( scope.listener );

			audioLoader.load( path, ( buffer ) => {

				sound.setBuffer( buffer );
				sound.setVolume( 1 );

			} );

			return sound;

		}

		this.sounds.soundExplosion1 = loadSound( 'Explosion3__003.ogg' );
		this.sounds.soundExplosion2 = loadSound( 'Explosion 4 - Sound effects Pack 2.ogg' );
		this.sounds.soundShot1 = loadSound( 'Pew__009.ogg' );
		this.sounds.soundHit1 = loadSound( 'Punch__008.ogg' );
		*/

		this.objectsUtils = new ObjectsUtils( this );
		this.modelClassLibrary = new ModelClassLibrary( this );

		this.modelClassLibrary.loadClasses( () => {

			const sceneBuilder = new SceneBuilder( this );

			//sceneBuilder.build( 'crater1/crater1.glb', onInited );
			//sceneBuilder.build( 'island1Scene/island1.glb', onInited );
			//sceneBuilder.build( 'testVehicle1/testVehicle1Scene.glb', onInited );

			const scenes = [
				'crater1/crater1.glb',
				'island1Scene/island1.glb',
				'testVehicle1/testVehicle1Scene.glb'
			];

			const urlParams = new URLSearchParams( window.location.search );
			let sceneIndex = 0;
			const param = urlParams.get( 'scene' );
			if ( param ) sceneIndex = parseInt( param );

			sceneBuilder.build( scenes[ sceneIndex ], onInited );

		} );

	}

	playSound( sound ) {

		if ( sound.isPlaying ) sound.stop();
		sound.play();

	}

	createLambertMaterial( color ) {

		return new MeshLambertMaterial( { color: color } );

	}

	step( deltaTime ) {

		// Actuators
		for ( let i = 0, l = this.actuators.length; i < l; ) {

			this.actuators[ i ].actuate( deltaTime, this.time );

			if ( this.actuators[ i ].isDestroyed() ) {

				this.actuators.splice( i, 1 );
				l --;

			}
			else i ++;

		}

		// Change of vehicle
		const enterExitPressed = this.controller.fire1 > 0;// && this.controller.fire2 > 0;
		if ( ! this.enterExitPressed && enterExitPressed ) {

			this.changeToNextVehicle();

		}
		this.enterExitPressed = enterExitPressed;

		// Physics
		this.physics.update( deltaTime );

		this.time += deltaTime;

	}

	changeToNextVehicle() {

		if ( this.vehicles.length === 0 ) return;

		let index = this.vehicles.indexOf( this.player.avatar.object );
		if ( index < 0 ) index = -1;

		index++;

		if ( index >= this.vehicles.length ) index = 0;

		this.vehicles[ index ].userData.avatar.possessBy( this.player );

	}

	changeToNextCamera() {

		if ( this.cameras.length === 0 ) return;

		let index = this.cameras.indexOf( this.camera );
		if ( index < 0 ) index = -1;

		index++;

		if ( index >= this.cameras.length ) index = 0;

		this.setCamera( this.cameras[ index ] );

	}

	setCamera( camera ) {

		this.camera = camera;
		this.onWindowResize();

	}

	onWindowResize() {

		if ( this.camera.isPerspectiveCamera ) {

			this.camera.near= 0.1;
			this.camera.far = 10000;
			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();

		}

	}

}

export { Game };
