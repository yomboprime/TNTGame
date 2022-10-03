
class StaticType {

	constructor() {}

	createInstance( game, sceneModel, jsonData, onCreated ) {

		const instance = sceneModel;

		instance.userData.mass = 0;

		game.objectsUtils.setObjectShadowProperties( instance, jsonData );

		game.physics.createRigidBodyWithShapeFromObject( game.scene, instance, { collision: 'convexhulls' } );

		onCreated( instance, true );

	}

}

export { StaticType };
