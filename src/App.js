
import {
	Vector3,
	BoxGeometry,
	Mesh,
	Clock,
	MeshStandardMaterial,
	PointLight,
	Scene,
	WebGLRenderer,
	sRGBEncoding,
	ACESFilmicToneMapping,
	ReinhardToneMapping
} from 'three';

import { Game } from './Game.js';

let app, game, renderer;

let connectedGamepads = [];
let joy1GamepadIndex = null;
let joy2GamepadIndex = null;
let joy1Controller = null;
let joy2Controller = null;

class App {

	init() {

		app = this;
		const scope = this;

		Ammo().then( function ( AmmoLib ) {

			Ammo = AmmoLib;

			renderer = new WebGLRenderer( { antialias: true } );

			renderer.physicallyCorrectLights = true;
			renderer.outputEncoding = sRGBEncoding;
			renderer.shadowMap.enabled = true;
			//renderer.toneMapping = ACESFilmicToneMapping;
			//renderer.toneMapping = ReinhardToneMapping;
			renderer.setPixelRatio( window.devicePixelRatio );
			renderer.setSize( window.innerWidth, window.innerHeight );

			document.body.appendChild( renderer.domElement );

			scope.clock = new Clock();

			window.addEventListener( 'resize', onWindowResize, false );

			const instructionsDiv = document.createElement( 'div' );
			instructionsDiv.innerHTML = "'1': Change to next camera.<br/>'Space': Change to next vehicle.<br/>Cursors/gamepad controls the vehicle.";
			instructionsDiv.style.position = "absolute";
			instructionsDiv.style.top = "0px";
			instructionsDiv.style.left = "0px";
			instructionsDiv.style.color = "gray";
			document.body.appendChild( instructionsDiv );

			document.body.addEventListener( 'keydown', ( event ) => {

				switch ( event.code ) {

					case 'ArrowUp':
						game.controller.y = 1;
						break;

					case 'ArrowDown':
						game.controller.y = - 1;
						break;

					case 'ArrowLeft':
						game.controller.x = - 1;
						break;

					case 'ArrowRight':
						game.controller.x = 1;
						break;

					case 'Space':
						game.controller.fire1 = 1;
						break;

					case 'KeyM':
						game.controller.fire2 = 1;
						break;

					case 'Digit1':
						game.changeToNextCamera();
						break;

				}

			}, false );

			document.body.addEventListener( 'keyup', ( event ) => {

				switch ( event.code ) {

					case 'ArrowUp':
						game.controller.y = 0;
						break;

					case 'ArrowDown':
						game.controller.y = 0;
						break;

					case 'ArrowLeft':
						game.controller.x = 0;
						break;

					case 'ArrowRight':
						game.controller.x = 0;
						break;

					case 'Space':
						game.controller.fire1 = 0;
						break;

					case 'KeyM':
						game.controller.fire2 = 0;
						break;

				}

			}, false );

			game = new Game();
			game.init( renderer, Ammo, () => {

				joy1Controller = game.controller;
				window.addEventListener( 'gamepadconnected', onGamepadConnected );
				window.addEventListener( 'gamepaddisconnected', onGamepadDisconnected );

				onWindowResize();
				animate();

			} );

		} );

	}

}

function onWindowResize() {

	if ( game ) game.onWindowResize();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

function onGamepadConnected( e ) {

	const gamepad = e.gamepad;

	console.log( "Gamepad connected: " + gamepad.index + ", id:" + gamepad.id + ", num buttons: " + gamepad.buttons.length + ", num axes: " + gamepad.axes.length + ", mapping: " + gamepad.mapping + "." );

	for ( let i = 0, n = connectedGamepads.length; i < n; i ++ ) {

		if ( connectedGamepads[ i ].id === gamepad.id ) {

			return;

		}

	}

	if ( joy1GamepadIndex === null ) {

		joy1GamepadIndex = gamepad.index;

	}
	else if ( joy2GamepadIndex === null ) {

		joy2GamepadIndex = gamepad.index;

	}

	connectedGamepads.push( gamepad );

}

function onGamepadDisconnected( e ) {

	const gamepad = e.gamepad;

	console.log( "Gamepad disconnected, index: " + e.gamepad.index + ", id:" + e.gamepad.id );

	for ( let i = 0, n = connectedGamepads.length; i < n; i ++ ) {

		if ( connectedGamepads[ i ].id === gamepad.id ) {

			if ( joy1GamepadIndex === gamepad.index ) {

				joy1GamepadIndex = null;

			}
			else if ( hostGamepadMappingJoy2 === gamepad.index ) {

				joy2GamepadIndex = null;

			}

			connectedGamepads.splice( i, 1 );

			return;

		}

	}

}

function pollGamepads() {

	if ( joy1GamepadIndex !== null && joy1Controller !== null) {

		pollGamepad( joy1GamepadIndex, joy1Controller );

	}

	if ( joy2GamepadIndex !== null && joy2Controller !== null) {

		pollGamepad( joy2GamepadIndex, joy2Controller );

	}


}

function pollGamepad( gamepadIndex, controller ) {

	const gamepad = navigator.getGamepads()[ gamepadIndex ];

	if ( ! gamepad ) return;

	var numButtons = gamepad.buttons.length;
	for ( let i = 0, n = Math.min( numButtons, 2 ); i < n; i ++ ) {

		const pressed = gamepad.buttons[ i ].pressed;

		const button = i === 0 ? 'fire1' : 'fire2';
		controller[ button ] = pressed ? 1 : 0;

		if ( pressed ) console.log( button );

	}

	controller.x = gamepad.axes[ 0 ];
	controller.y = - gamepad.axes[ 1 ];

}

function animate() {

	const deltaTime = app.clock.getDelta();

	requestAnimationFrame( animate );

	pollGamepads();

	game.step( deltaTime );
	//game.step( 1 / 60 );

	renderer.render( game.scene, game.camera );

}

export default App;
