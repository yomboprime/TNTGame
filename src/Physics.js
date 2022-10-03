import {
	Vector3,
	Matrix4,
	Quaternion,
	Mesh,
	Box3,
	BoxGeometry
} from 'three';

import { ConvexObjectBreaker } from 'three/examples/jsm/misc/ConvexObjectBreaker.js';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';

import { ObjectsUtils } from './ObjectsUtils.js';


class Physics {

	constructor( Ammo ) {

		this.Ammo = Ammo;
		this.gravityConstant = 9.8;
		this.collisionConfiguration = null;
		this.dispatcher = null;
		this.broadphase = null;
		this.solver = null;
		this.physicsWorld = null;
		this.margin = 0.03;
		this.convexBreaker = new ConvexObjectBreaker();
		this.rigidBodies = [];
		this.pos = new Vector3();
		this.quat = new Quaternion();
		this.transformAux1 = null;
		this.transformAux2 = null;
		this.tempVec3_1 = null;
		this.tempVec3_2 = null;
		this.tempMat4_1 = null;

		this.tempVRayOrigin = null;
		this.tempVRayDest = null;

		this.tempBtVec3_1 = null;
		this.tempBtVec3_2 = null;
		this.tempBtVec3_3 = null;
		this.tempbtQuat = null;
		this.closestRayResultCallback = null;

	}

	init() {

		// Physics configuration

		this.collisionConfiguration = new this.Ammo.btDefaultCollisionConfiguration();
		this.dispatcher = new this.Ammo.btCollisionDispatcher( this.collisionConfiguration );
		this.broadphase = new this.Ammo.btDbvtBroadphase();
		this.solver = new this.Ammo.btSequentialImpulseConstraintSolver();
		this.physicsWorld = new this.Ammo.btDiscreteDynamicsWorld( this.dispatcher, this.broadphase, this.solver, this.collisionConfiguration );

		this.setGravity( this.gravityConstant );

		this.transformAux1 = new this.Ammo.btTransform();
		this.transformAux2 = new this.Ammo.btTransform();
		this.tempVec3_1 = new Vector3();
		this.tempVec3_2 = new Vector3();
		this.tempMat4_1 = new Matrix4();

		this.tempVRayOrigin = new this.Ammo.btVector3();
		this.tempVRayDest = new this.Ammo.btVector3();

		this.tempBtVec3_1 = new this.Ammo.btVector3( 0, 0, 0 );
		this.tempBtVec3_2 = new this.Ammo.btVector3( 0, 0, 0 );
		this.tempBtVec3_3 = new this.Ammo.btVector3( 0, 0, 0 );

		this.tempbtQuat = new this.Ammo.btQuaternion();
		this.closestRayResultCallback = new this.Ammo.ClosestRayResultCallback( this.tempVRayOrigin, this.tempVRayDest );

	}

	setGravity( gravityConstant ) {

		this.physicsWorld.setGravity( new this.Ammo.btVector3( 0, - gravityConstant, 0 ) );

	}

	getObjectVelocity( object, result ) {

		const v = object.userData.rigidBody.getLinearVelocity();
		result.set( v.x(), v.y(), v.z() );

	}

	getObjectAngularVelocity( object, result ) {

		const v = object.userData.rigidBody.getAngularVelocity();
		result.set( v.x(), v.y(), v.z() );

	}

	castPhysicsRay( origin, dest, intersectionPoint, intersectionNormal ) {

		// Returns null or object if ray hit, and returns intersection data on the last two vector parameters
		// TODO Mask and group filters can be added to the test (rayCallBack.m_collisionFilterGroup and m_collisionFilterMask)

		// Reset closestRayResultCallback to reuse it
		const rayCallBack = this.Ammo.castObject( this.closestRayResultCallback, this.Ammo.RayResultCallback );
		rayCallBack.set_m_closestHitFraction( 1 );
		rayCallBack.set_m_collisionObject( null );

		// Set closestRayResultCallback origin and dest
		this.tempVRayOrigin.setValue( origin.x, origin.y, origin.z );
		this.tempVRayDest.setValue( dest.x, dest.y, dest.z );
		this.closestRayResultCallback.get_m_rayFromWorld().setValue( origin.x, origin.y, origin.z );
		this.closestRayResultCallback.get_m_rayToWorld().setValue( dest.x, dest.y, dest.z );

		// Perform ray test
		this.physicsWorld.rayTest( this.tempVRayOrigin, this.tempVRayDest, this.closestRayResultCallback );

		if ( this.closestRayResultCallback.hasHit() ) {

			if ( intersectionPoint ) {
				const point = this.closestRayResultCallback.get_m_hitPointWorld();
				intersectionPoint.set( point.x(), point.y(), point.z() );
			}

			if ( intersectionNormal ) {
				const normal = this.closestRayResultCallback.get_m_hitNormalWorld();
				intersectionNormal.set( normal.x(), normal.y(), normal.z() );
			}

			const rb = this.closestRayResultCallback.m_collisionObject;
			if ( rb ) {

				const btv3 = this.Ammo.castObject( rb.getUserPointer(), this.Ammo.btVector3 );

				if ( btv3 && btv3.threeObject ) return btv3.threeObject;

				return null;

			}

		}
		else {

			return null;

		}

	}

	createParalellepipedWithPhysics( scene, sx, sy, sz, mass, pos, quat, material ) {

		const object = new Mesh( new BoxGeometry( sx, sy, sz, 1, 1, 1 ), material );
		const shape = new this.Ammo.btBoxShape( new this.Ammo.btVector3( sx * 0.5, sy * 0.5, sz * 0.5 ) );
		shape.setMargin( this.margin );

		this.createRigidBody( scene, object, shape, mass, pos, quat );

		return object;

	}

	createPhysicsFromObject( scene, object, physicProperties ) {

		if ( ! physicProperties ) {

			console.error( "Couldn't create dynamic object, missing physicProperties." );
			return null;

		}

		object.userData.mass = physicProperties.mass;

		let body = null;

		switch ( physicProperties.collision ) {

			case 'boxes':
			case 'spheres':
			case 'convexhulls':
				body = this.createRigidBodyWithShapeFromObject( scene, object, physicProperties );
				break;

			case 'softbody':
				// TODO
				break;

			case 'rope':
				// TODO
				break;

			case 'cloth':
				// TODO
				break;

		}

		if ( ! body ) {

			console.error( "Couldn't create dynamic object of class '" + jsonData.className + "', name: '" + sceneModel.name + "'." );

		}

		return body;

	}

	createRigidBodyWithShapeFromObject( scene, object, physicProperties ) {

		// If object.userData.shapesSrcObject is provided, it is used to extract physics shapes.

		const srcObject = object.userData.shapesSrcObject ? object.userData.shapesSrcObject : object;

		let shape = null;
		switch ( physicProperties.collision ) {

			case 'spheres':
				shape = this.createPhysicsShapeFromObjectSpheres( srcObject, physicProperties.excludeShapesObjectNames );
				break;

			case 'boxes':
				shape = this.createPhysicsShapeFromObjectBoxes( srcObject, physicProperties.excludeShapesObjectNames );
				break;

			case 'convexhulls':
				shape = this.createPhysicsShapeFromObjectConvexHulls( srcObject, physicProperties.excludeShapesObjectNames );
				break;

		}

		if ( ! shape ) {

			console.error( "Couldn't create rigid body physics shape for object named '" + object.name + "'. It has collision type: '" + physicProperties.collision + "'." );
			return null;

		}

		const body = this.createRigidBody( scene, object, shape, object.userData.mass, object.position, object.quaternion, object.userData.velocity, object.userData.angularVelocity );

		return body;

	}

	createPhysicsShapeFromObjectSphere( object ) {

		object.geometry.computeBoundingSphere();
		const center = object.geometry.boundingSphere.center;
		let shape = new this.Ammo.btSphereShape( object.geometry.boundingSphere.radius );
		if ( center.length() > 0.001 ) {

			const compoundShape = new this.Ammo.btCompoundShape();
			this.transformAux2.setIdentity();
			this.tempVec3_1.copy( center )/*.add( object.position )*/;
			this.tempBtVec3_1.setValue( this.tempVec3_1.x, this.tempVec3_1.y, this.tempVec3_1.z );
			this.transformAux2.setOrigin( this.tempBtVec3_1 );
			compoundShape.addChildShape( this.transformAux2, shape );
			shape = compoundShape;

		}
		shape.setMargin( this.margin );

		return shape;

	}

	createPhysicsShapeFromObjectBox( object ) {

		const box = new Box3();
		box.expandByObject( object );
		box.getCenter( this.tempVec3_1 );
		box.getSize( this.tempVec3_2 ).multiplyScalar( 0.5 );
		let shape = new this.Ammo.btBoxShape( new this.Ammo.btVector3( this.tempVec3_2.x, this.tempVec3_2.y, this.tempVec3_2.z ) );
		if ( this.tempVec3_1.length() > 0.001 ) {

			const compoundShape = new this.Ammo.btCompoundShape();
			this.transformAux2.setIdentity();
			this.tempBtVec3_1.setValue( this.tempVec3_1.x, this.tempVec3_1.y, this.tempVec3_1.z );
			this.transformAux2.setOrigin( this.tempBtVec3_1 );
			compoundShape.addChildShape( this.transformAux2, shape );
			shape = compoundShape;

		}
		shape.setMargin( this.margin );

		return shape;

	}

	createPhysicsShapeFromObjectSpheres( object, excludeShapesObjectNames ) {

		let shape = null;
		if ( object.children.length > 0 ) shape = this.createCompoundPhysicsShapeSpheres( object, excludeShapesObjectNames );
		else shape = this.createPhysicsShapeFromObjectSphere( object );
		shape.setMargin( this.margin );

		return shape;

	}

	createPhysicsShapeFromObjectBoxes( object, excludeShapesObjectNames ) {

		let shape = null;
		if ( object.children.length > 0 ) shape = this.createCompoundPhysicsShapeBoxes( object, excludeShapesObjectNames );
		else shape = this.createPhysicsShapeFromObjectBox( object );
		shape.setMargin( this.margin );

		return shape;

	}

	createPhysicsShapeFromObjectConvexHulls( object, excludeShapesObjectNames ) {

		const isStatic = object.userData.mass === 0;

		let shape = null;
		if ( object.children.length > 0 ) shape = this.createCompoundPhysicsShape( object, excludeShapesObjectNames );
		else {

			if ( isStatic ) shape = this.createBVHPhysicsShape( object );
			else shape = this.createConvexHullPhysicsShape( object );

		}
		shape.setMargin( this.margin );

		return shape;

	}

	isInExcludeShapesObjectNames( object, excludeShapesObjectNames ) {

		if ( ! excludeShapesObjectNames ) return false;

		for ( let i = 0, l = excludeShapesObjectNames.length; i < l; i ++ ) {

			if ( excludeShapesObjectNames[ i ].name === object.name ) return true;

		}

		return false;

	}

	createCompoundPhysicsShape( object, excludeShapesObjectNames ) {

		const isStatic = object.userData.mass === 0;

		const compoundShape = new this.Ammo.btCompoundShape();

		this.transformAux1.setIdentity();
		const scope = this;

		traverseRecursive( object );

		return compoundShape;

		function traverseRecursive( c ) {

			const isExcluded = scope.isInExcludeShapesObjectNames( c, excludeShapesObjectNames );

			if ( c.isMesh && ! isExcluded ) {

				let childShape = null;

				if ( isStatic ) childShape = scope.createBVHPhysicsShape( c );
				else childShape = scope.createConvexHullPhysicsShape( c );

				compoundShape.addChildShape( scope.transformAux1, childShape );

			}

			if ( ! isExcluded ) {

				for ( let i = 0, n = c.children.length; i < n; i ++ ) traverseRecursive( c.children[ i ] );

			}

		}

	}

	createCompoundPhysicsShapeBoxes( object, excludeShapesObjectNames ) {

		const compoundShape = new this.Ammo.btCompoundShape();

		this.transformAux1.setIdentity();
		const scope = this;

		traverseRecursive( object );

		return compoundShape;

		function traverseRecursive( c ) {

			const isExcluded = scope.isInExcludeShapesObjectNames( c, excludeShapesObjectNames );

			if ( c.isMesh && ! isExcluded ) {

				let childShape = scope.createPhysicsShapeFromObjectBox( c );

				compoundShape.addChildShape( scope.transformAux1, childShape );

			}

			if ( ! isExcluded ) {

				for ( let i = 0, n = c.children.length; i < n; i ++ ) traverseRecursive( c.children[ i ] );

			}

		}

	}

	createCompoundPhysicsShapeSpheres( object, excludeShapesObjectNames ) {

		const compoundShape = new this.Ammo.btCompoundShape();

		this.transformAux1.setIdentity();
		const scope = this;

		traverseRecursive( object );

		return compoundShape;

		function traverseRecursive( c ) {

			const isExcluded = scope.isInExcludeShapesObjectNames( c, excludeShapesObjectNames );

			if ( c.isMesh && ! isExcluded ) {

				let childShape = scope.createPhysicsShapeFromObjectSphere( c );

				compoundShape.addChildShape( scope.transformAux1, childShape );

			}

			if ( ! isExcluded ) {

				for ( let i = 0, n = c.children.length; i < n; i ++ ) traverseRecursive( c.children[ i ] );

			}

		}

	}

	createConvexHullPhysicsShape( object ) {

		let transform = null;
		object.updateMatrixWorld();
		transform = object.matrixWorld;

		const shape = new this.Ammo.btConvexHullShape();
		const coords = object.geometry.attributes.position.array;

		for ( let i = 0, il = coords.length; i < il; i += 3 ) {

			this.tempVec3_1.set( coords[ i ], coords[ i + 1 ], coords[ i + 2 ] );
			this.tempVec3_1.applyMatrix4( transform );

			this.tempBtVec3_1.setValue( this.tempVec3_1.x, this.tempVec3_1.y, this.tempVec3_1.z );
			const lastOne = i >= ( il - 3 );
			shape.addPoint( this.tempBtVec3_1, lastOne );

		}

		return shape;

	}

	createBVHPhysicsShape( mesh ) {

		// Flags: 32 bit indices?, 4 components?
		const shapeTriMesh = new this.Ammo.btTriangleMesh( true , false );
		const indices = mesh.geometry.getIndex() ? mesh.geometry.getIndex().array : null;
		const positions = mesh.geometry.getAttribute( 'position' ).array;

		mesh.updateMatrixWorld();

		if ( indices ) {

			for ( var i = 0, il = indices.length; i < il; i += 3 ) {

				var pos = indices[ i ] * 3;
				this.tempVec3_1.set( positions[ pos ], positions[ pos + 1 ], positions[ pos + 2 ] ).applyMatrix4( mesh.matrixWorld );
				this.tempBtVec3_1.setValue( this.tempVec3_1.x, this.tempVec3_1.y, this.tempVec3_1.z );

				pos = indices[ i + 1 ] * 3;
				this.tempVec3_1.set( positions[ pos ], positions[ pos + 1 ], positions[ pos + 2 ] ).applyMatrix4( mesh.matrixWorld );
				this.tempBtVec3_2.setValue( this.tempVec3_1.x, this.tempVec3_1.y, this.tempVec3_1.z );

				pos = indices[ i + 2 ] * 3;
				this.tempVec3_1.set( positions[ pos ], positions[ pos + 1 ], positions[ pos + 2 ] ).applyMatrix4( mesh.matrixWorld );
				this.tempBtVec3_3.setValue( this.tempVec3_1.x, this.tempVec3_1.y, this.tempVec3_1.z );

				shapeTriMesh.addTriangle( this.tempBtVec3_1, this.tempBtVec3_2, this.tempBtVec3_3, i >= il - 3 );

			}

		}
		else {

			for ( var i = 0, il = positions.length; i < il; i += 9 ) {

				var pos = i * 9;
				this.tempVec3_1.set( positions[ pos ], positions[ pos + 1 ], positions[ pos + 2 ] ).applyMatrix4( mesh.matrixWorld );
				this.tempBtVec3_1.setValue( this.tempVec3_1.x, this.tempVec3_1.y, this.tempVec3_1.z );

				pos = i * 9 + 3;
				this.tempVec3_1.set( positions[ pos ], positions[ pos + 1 ], positions[ pos + 2 ] ).applyMatrix4( mesh.matrixWorld );
				this.tempBtVec3_2.setValue( this.tempVec3_1.x, this.tempVec3_1.y, this.tempVec3_1.z );

				pos = i * 9 + 6;
				this.tempVec3_1.set( positions[ pos ], positions[ pos + 1 ], positions[ pos + 2 ] ).applyMatrix4( mesh.matrixWorld );
				this.tempBtVec3_3.setValue( this.tempVec3_1.x, this.tempVec3_1.y, this.tempVec3_1.z );

				shapeTriMesh.addTriangle( this.tempBtVec3_1, this.tempBtVec3_2, this.tempBtVec3_3, i >= il - 9 );

			}

		}

		// Flags: aabb compression?, buildbvh?
		var shape = new this.Ammo.btBvhTriangleMeshShape( shapeTriMesh, true , true );
		shape.setMargin( this.margin );

		return shape;

	}

	createRigidBody( scene, object, physicsShape, mass, pos, quat, vel, angVel ) {

		if ( object ) {

			if ( mass > 0 ) {

				if ( pos ) {

					object.position.copy( pos );

				} else {

					pos = object.position;

				}

			}
			else pos = null;

			if ( quat ) {

				object.quaternion.copy( quat );

			} else {

				quat = object.quaternion;

			}

		}

		const transform = new this.Ammo.btTransform();
		transform.setIdentity();
		if ( pos ) transform.setOrigin( new this.Ammo.btVector3( pos.x, pos.y, pos.z ) );
		else transform.setOrigin( new this.Ammo.btVector3( 0, 0, 0 ) );
		if ( quat ) transform.setRotation( new this.Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
		else transform.setRotation( new this.Ammo.btQuaternion( 0, 0, 0, 1 ) );
		const motionState = new this.Ammo.btDefaultMotionState( transform );

		const localInertia = new this.Ammo.btVector3( 0, 0, 0 );
		physicsShape.calculateLocalInertia( mass, localInertia );

		const rbInfo = new this.Ammo.btRigidBodyConstructionInfo( mass, motionState, physicsShape, localInertia );
		const body = new this.Ammo.btRigidBody( rbInfo );

		body.setFriction( 0.5 );

		if ( vel ) {

			body.setLinearVelocity( new this.Ammo.btVector3( vel.x, vel.y, vel.z ) );

		}

		if ( angVel ) {

			body.setAngularVelocity( new this.Ammo.btVector3( angVel.x, angVel.y, angVel.z ) );

		}

		if ( object ) {

			object.userData.rigidBody = body;
			object.userData.mass = mass;

			const btVecUserData = new this.Ammo.btVector3( 0, 0, 0 );
			btVecUserData.threeObject = object;
			body.setUserPointer( btVecUserData );

			scene.add( object );

		}

		if ( mass > 0 ) {

			if ( object ) this.rigidBodies.push( object );

			// Disable deactivation
			body.setActivationState( 4 );

		}

		this.physicsWorld.addRigidBody( body );

		return body;

	}

	update( deltaTime ) {

		// Step world
		this.physicsWorld.stepSimulation( deltaTime, 10 );

		// Update rigid bodies
		for ( let i = 0, il = this.rigidBodies.length; i < il; i ++ ) {

			const objThree = this.rigidBodies[ i ];
			const objPhys = objThree.userData.rigidBody;
			const ms = objPhys.getMotionState();

			if ( ms ) {

				ms.getWorldTransform( this.transformAux1 );
				const p = this.transformAux1.getOrigin();
				const q = this.transformAux1.getRotation();
				objThree.position.set( p.x(), p.y(), p.z() );
				objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );

			}

		}

	}

}

export { Physics };
