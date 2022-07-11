import TwitchChat from "twitch-chat-emotes-threejs";
import * as THREE from "three";
import Stats from "stats-js";
import "./main.css";
import { applyShader } from './utils';


/*
** connect to twitch chat
*/

// a default array of twitch channels to join
let channels = ['moonmoon'];

// the following few lines of code will allow you to add ?channels=channel1,channel2,channel3 to the URL in order to override the default array of channels
const query_vars = {};
const query_parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
	query_vars[key] = value;
});

if (query_vars.channels || query_vars.channel) {
	const temp = query_vars.channels || query_vars.channel;
	channels = temp.split(',');
}

let stats = false;
if (query_vars.stats) {
	stats = new Stats();
	stats.showPanel(1);
	document.body.appendChild(stats.dom);
}

const ChatInstance = new TwitchChat({
	THREE,

	// If using planes, consider using MeshBasicMaterial instead of SpriteMaterial
	materialType: THREE.MeshBasicMaterial,

	// Passed to material options
	materialOptions: {
		transparent: true,
	},

	materialHook: (material) => {
		applyShader(material, true);
	},

	channels,
	maximumEmoteLimit: 4,
	duplicateEmoteLimit: 2,
})

/*
** Initiate ThreeJS
*/

const camera = new THREE.PerspectiveCamera(
	70,
	window.innerWidth / window.innerHeight,
	0.1,
	3000
);
camera.position.z = 20;
camera.position.y = 2;
camera.rotation.x = Math.PI / 12;


const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });

function resize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('DOMContentLoaded', () => {
	resize();
	window.addEventListener('resize', resize);
	if (stats) document.body.appendChild(stats.dom);
	document.body.appendChild(renderer.domElement);
	draw();
})


/*
** Handle Twitch Chat Emotes
*/
const sceneEmoteArray = [];
const emoteGeometry = new THREE.PlaneBufferGeometry(1, 1, 1, 1);
ChatInstance.listen((emotes) => {
	const group = new THREE.Group();
	group.timestamp = Date.now();
	group.position.z = camera.position.z * 2 * Math.random() - camera.position.z;

	const diff = Math.abs(group.position.z - camera.position.z);

	group.position.x = -15 * (diff / 10) * (Math.random() * 0.5 + 0.5);

	let i = 0;
	emotes.forEach((emote) => {
		const plane = new THREE.Mesh(emoteGeometry, emote.material);
		plane.position.x = i;
		plane.position.y = 0.4;
		group.add(plane);
		i++;
	})

	// Set velocity to a random normalized value
	group.velocity = new THREE.Vector3(
		0.75 + Math.random(),
		0,
		0
	);
	//group.velocity.normalize();

	group.lifespan = ((-group.position.x - group.position.x) / group.velocity.x) * 1000;
	group.lifespan *= Math.random() * 0.75 + 0.25;

	group.update = () => { // called every frame
		let progress = (Date.now() - group.timestamp) / group.lifespan;
		if (progress < 0.1) { // float up in first 1/10
			group.position.y = -Math.pow(1 - (progress * 10), 2);
		} else if (progress > 0.9) { // sink down last 1/10
			group.position.y = -Math.pow((progress - 0.9) * 10, 2);
		} else { // maintain full size in middle
			group.position.y = 0;
		}
	}

	scene.add(group);
	sceneEmoteArray.push(group);
});


/*
	Scene setup
*/
const ambientLight = new THREE.AmbientLight(new THREE.Color('#9EFFF7'), 0.1);
const sunLight = new THREE.DirectionalLight(new THREE.Color('#FFFFFF'), 1);
sunLight.position.set(0.1, 1, -0.25);
scene.add(ambientLight);
scene.add(sunLight);

import skyTextureURL from './sky.png';
const skyTexture = new THREE.TextureLoader().load(skyTextureURL);
scene.fog = new THREE.Fog(new THREE.Color('#FFFFFF'), 1, 100);

const sky = new THREE.Mesh(new THREE.SphereBufferGeometry(2000, 16, 8), new THREE.MeshBasicMaterial({
	map: skyTexture,
	side: THREE.BackSide,
	fog: false,
}));
scene.add(sky);

const ocean = new THREE.Mesh(
	new THREE.PlaneBufferGeometry(160, 60, Math.round(160 * 0.6), Math.round(60 * 0.6)),
	new THREE.MeshStandardMaterial({
		color: new THREE.Color('#2BD9E5'),
		metalness: 0.2,
		roughness: 1,
		flatShading: true,
	})
);
applyShader(ocean.material);
ocean.geometry.rotateX(-Math.PI / 2);
scene.add(ocean);


import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
const modelLoader = new GLTFLoader();
modelLoader.load('/island.glb', function (gltf) {
	scene.add(gltf.scene);
	gltf.scene.rotation.y = -Math.PI;
	gltf.scene.scale.setScalar(2.5);
	gltf.scene.position.set(16.875 * camera.aspect, -2, -27);

	const tree = gltf.scene.getObjectByName('Tree');
	applyShader(tree.material, false, 'wind')
});

import { cloudGroup } from './clouds';
scene.add(cloudGroup);


/*
** Draw loop
*/
let lastFrame = performance.now();
function draw() {
	if (stats) stats.begin();
	requestAnimationFrame(draw);
	const delta = Math.min(1, Math.max(0, (performance.now() - lastFrame) / 1000));
	lastFrame = performance.now();


	for (let index = sceneEmoteArray.length - 1; index >= 0; index--) {
		const element = sceneEmoteArray[index];
		element.position.addScaledVector(element.velocity, delta);
		if (element.timestamp + element.lifespan < Date.now()) {
			sceneEmoteArray.splice(index, 1);
			scene.remove(element);
		} else {
			element.update();
		}
	}

	cloudGroup.tick(delta);

	renderer.render(scene, camera);
	if (stats) stats.end();
};