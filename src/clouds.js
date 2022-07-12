import * as THREE from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
const modelLoader = new GLTFLoader();

export const cloudGroup = new THREE.Group();
cloudGroup.tick = (delta) => {
	cloudGroup.rotation.y -= delta * 0.01;
}
const clouds = [
	'cloud01.glb',
	'cloud02.glb',
	'cloud03.glb',
	'cloud04.glb',
];
let loadedClouds = 0;
for (let index = 0; index < clouds.length; index++) {
	modelLoader.load('/clouds/' + clouds[index], (gltf) => {
		clouds[index] = gltf.scene.children[0];
		loadedClouds++;
		if (loadedClouds === clouds.length) {
			const count = 20;
			for (let index = 0; index < count; index++) {
				spawnCloud(index / count, count);
			}
		}
	});
}
const cloudMat = new THREE.MeshPhongMaterial({
	color: 0x666666,
	emissive: 0xBBBBBB,
	flatShading: true,
	fog: false,
	shininess: 0,
})

const spawnCloud = (position, count) => {
	const cloud = clouds[Math.floor(Math.random() * clouds.length)];
	if (typeof cloud === 'string') return;
	const element = new THREE.Mesh(
		cloud.geometry,
		cloudMat
	);
	element.scale.setScalar(30 * Math.pow(Math.random(), 2) + 10);
	element.rotation.y = Math.random() * Math.PI * 2;
	element.position.y = 100 + (Math.random() > 0.5 ? 400 : 0);

	const direction = ((Math.random() * Math.PI) / count) + (position * Math.PI * 2);
	const distance = Math.random() * 800 + 600;
	element.position.x = Math.sin(direction) * distance;
	element.position.z = Math.cos(direction) * distance;
	cloudGroup.add(element);
};