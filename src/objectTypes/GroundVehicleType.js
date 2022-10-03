import {
	Vector3,
	Quaternion,
	Matrix4
} from 'three';

import { DynamicType } from "./DynamicType.js";

class GroundVehicleType extends DynamicType {

	constructor() {

		super();

	}

	createInstance( game, sceneModel, jsonData, onCreated ) {

		jsonData.physicProperties.excludeShapesObjectNames = jsonData.wheels;

		super.createInstance( game, sceneModel, jsonData, ( instance, removed ) => {

			const wheels = [ ];
			let steering = 0;
			let tiltedElapsedTime = 0;

			const tempVec1 = new Vector3();
			const tempVec2 = new Vector3();
			const tempQuat1 = new Quaternion();
			const tempMat1 = new Matrix4();
			const tempMat2 = new Matrix4();
			const tempMat3 = new Matrix4();
			const tempVecBt1 = new game.Ammo.btVector3();
			const tempVecBt2 = new game.Ammo.btVector3();
			const tempVecBt3 = new game.Ammo.btVector3();
			const tempQuatBt1 = new game.Ammo.btQuaternion();

			const tuning = new game.Ammo.btVehicleTuning();
			const rayCaster = new game.Ammo.btDefaultVehicleRaycaster( game.physics.physicsWorld );
			const vehicle = new game.Ammo.btRaycastVehicle( tuning, instance.userData.rigidBody, rayCaster );
			vehicle.setCoordinateSystem( 0, 1, 2 );

			game.physics.physicsWorld.addAction( vehicle );

			const numWheels = jsonData.wheels.length;
			for ( let i = 0; i < numWheels; i ++ ) {

				const wheelName = jsonData.wheels[ i ].wheelName;
				const wheel = game.objectsUtils.findObjectByNameAndClassProperty( instance, wheelName, 'isMesh' );

				if ( ! wheel ) {

					console.error( "Could not find wheel with name or index " + wheelName + ", in groundVehicle named " + instance.name + "." );
					onCreated( instance, removed )
					return;

				}

				addWheel( wheel, jsonData.wheels[ i ] );

			}

			vehicleStep( 0, 0 );

			game.actuators.push( {
				actuate: vehicleStep,
				isDestroyed: () => { return false; }
			} );

			game.vehicles.push( instance );

			onCreated( instance, removed )

			function addWheel( wheel, wheelJSON ) {

				wheels.push( wheel );

				// Center the wheel geometry
				game.objectsUtils.centerModelGeometry( wheel );

				// Create physics wheel
				tempVecBt1.setValue( Math.abs( wheel.position.x ) * ( wheelJSON.isLeftWheel ? 1 : - 1 ), wheel.position.y, wheel.position.z );
				tempVecBt2.setValue( 0, - 1, 0 );
				tempVecBt3.setValue( - 1, 0, 0 );

				const wheelInfo = vehicle.addWheel(
					tempVecBt1,
					tempVecBt2,
					tempVecBt3,
					wheelJSON.suspensionRestLength,
					wheelJSON.radius,
					tuning,
					wheelJSON.steering !== 0
				);
				/*
				wheelInfo.set_m_suspensionStiffness( suspensionStiffness );
				wheelInfo.set_m_wheelsDampingRelaxation( suspensionDamping );
				wheelInfo.set_m_wheelsDampingCompression( suspensionCompression );
				wheelInfo.set_m_frictionSlip( friction );
				wheelInfo.set_m_rollInfluence( rollInfluence );
				*/

				wheel.userData.steering = wheelJSON.steering;
				wheel.userData.isLeftWheel = wheelJSON.isLeftWheel;
				game.scene.attach( wheel );

			}

			function vehicleStep( deltaTime, time ) {

				// User control (steering, accelerator, brake)

				const controller = instance.userData.avatar ? instance.userData.avatar.getController() : null;

				if ( controller ) {

					const currentVel = vehicle.getCurrentSpeedKmHour() / 3.6;

					const velFactor = Math.abs( currentVel ) / jsonData.maxVelocity;

					const maxForceAtVel = jsonData.maxMotorForce * ( 1 - velFactor );
					let force = 0;
					let brake = 0;

					if ( controller.y > 0 ) {

						if ( currentVel < - 1 ) {

							brake = jsonData.maxBrakeForce;

						}
						else {

							force = maxForceAtVel * controller.y;

						}

					}
					else if ( controller.y < 0 ) {

						if ( currentVel > 1 ) {

							brake = jsonData.maxBrakeForce;

						}
						else {

							force = maxForceAtVel * controller.y;

						}

					}

					let maxSteering = jsonData.maxSteeringAngle * ( 1 - velFactor ) + velFactor * jsonData.maxSteeringAngle * 0.1;
					const absx = Math.abs( controller.x );
					if ( absx !== 0 ) {
						maxSteering *= absx;
					}
					steering -= 2.5 * Math.sign( controller.x ) * deltaTime;
					steering = Math.max( - maxSteering, Math.min( maxSteering, steering ) );
					if ( controller.x === 0 ) {
						steering -= deltaTime * Math.sign( steering );
					}
					if ( Math.abs( steering ) < 0.0005 ) {
						steering = 0;
					}

					for ( let i = 0, n = wheels.length; i < n; i ++ ) {

						var wheel = wheels[ i ];

						vehicle.applyEngineForce( force, i );
						vehicle.setBrake( brake, i );

						const wheelSteering = wheels[ i ].userData.steering;
						if ( wheelSteering !== 0 ) {

							vehicle.setSteeringValue( wheelSteering * steering, i );

						}

					}

					// Driving aid: if the vehicle is tilted for too long, reset its orientation

					tempVec1.set( 0, 1, 0 ).applyQuaternion( instance.quaternion );
					if ( tempVec1.y < 0.05 ) {

						tiltedElapsedTime += deltaTime;

						if ( tiltedElapsedTime > 2.8 ) {

							const body = instance.userData.rigidBody;

							const wt = body.getWorldTransform();
							const p0 = wt.getOrigin();
							tempVecBt1.setValue( p0.x(), p0.y() + 2, p0.z() );
							tempQuatBt1.setValue( 0, 0, 0, 1 );
							wt.setOrigin( tempVecBt1 );
							wt.setRotation( tempQuatBt1 );
							body.setWorldTransform( wt );

							tempVecBt1.setValue( 0, 0, 0 );
							body.setLinearVelocity( tempVecBt1 );
							body.setAngularVelocity( tempVecBt1 );

							tiltedElapsedTime = 0;

						}

					}
					else {

						tiltedElapsedTime = 0;

					}

				}

				// Update wheels

				for ( let i = 0; i < numWheels; i ++ ) {

					const wheel = wheels[ i ];

					vehicle.updateWheelTransform( i, true );
					const wheelTransform = vehicle.getWheelTransformWS( i );
					const p = wheelTransform.getOrigin();
					const q = wheelTransform.getRotation();

					wheel.position.set( p.x(), p.y(), p.z() );
					wheel.quaternion.set( q.x(), q.y(), q.z(), q.w() );

				}

			}

		} );

	}

}

export { GroundVehicleType };
