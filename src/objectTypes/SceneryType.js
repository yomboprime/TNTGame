
class SceneryType {

	constructor() {}

	createInstance( game, sceneModel, jsonData, onCreated ) {

		const instance = sceneModel;

		game.objectsUtils.setObjectShadowProperties( instance, jsonData );

		game.scene.add( instance );

		onCreated( instance, true );

	}

}

export { SceneryType };
