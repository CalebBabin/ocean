import TwitchChat from "twitch-chat-emotes-threejs";
import * as THREE from "three";
import Stats from "stats-js";
import "./main.css";

window.shaderPID = 10000;

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
	maximumEmoteLimit: 3,
})

/*
** Initiate ThreejS scene
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
	Ocean setup
*/
const ambientLight = new THREE.AmbientLight(new THREE.Color('#9EFFF7'), 0.1);
const sunLight = new THREE.DirectionalLight(new THREE.Color('#FFFFFF'), 1);
sunLight.position.set(0.1, 1, -0.25);
scene.add(ambientLight);
scene.add(sunLight);

import skyTextureURL from './sky.png';
const skyTexture = new THREE.TextureLoader().load(skyTextureURL);
scene.fog = new THREE.Fog(new THREE.Color('#D894F3'), 1, 80);

const sky = new THREE.Mesh(new THREE.SphereBufferGeometry(2000, 16, 8), new THREE.MeshBasicMaterial({
	map: skyTexture,
	side: THREE.BackSide,
	fog: false,
}));
scene.add(sky);

const ocean = new THREE.Mesh(
	new THREE.PlaneBufferGeometry(160, 60, Math.round(160 * 0.6), Math.round(60 * 0.6)),
	new THREE.MeshStandardMaterial({
		color: new THREE.Color('#4FD0FF'),
		metalness: 0.2,
		roughness: 1,
		flatShading: true,
	})
);
applyShader(ocean.material);
ocean.geometry.rotateX(-Math.PI / 2);
scene.add(ocean);

import waterVert from './water.vert';
import windVert from './wind.vert';
import snoiseShader from './snoise.glsl';
function applyShader(material, delayed = false, type = 'water') {
	const tickUniforms = () => {
		if (uniforms) {
			uniforms.u_time.value = performance.now() + (delayed ? -250 : 0);
		}
		window.requestAnimationFrame(tickUniforms);
	}
	let uniforms = null;
	//material.onBeforeCompile(())
	material.onBeforeCompile = function (shader) {
		shader.uniforms.u_time = { value: Math.random() * 1000 };
		uniforms = shader.uniforms;
		tickUniforms();

		material.userData.shader = shader;
		shader.vertexShader = shader.vertexShader.replace(
			'void main()',
			`
				uniform float u_time;
				${snoiseShader}
				void main()
			`);
		shader.vertexShader = shader.vertexShader.replace(
			'#include <begin_vertex>',
			`
			#include <begin_vertex>
			${type === 'water' ? waterVert : ''}
			${type === 'wind' ? windVert : ''}
		`);
	};

	// Make sure WebGLRenderer doesn't reuse a single program
	ocean.customProgramCacheKey = function () {
		return parseInt(window.shaderPID++); // some random ish number
	};
}

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

const cloudGroup = new THREE.Group();
cloudGroup.tick = (delta) => {
	cloudGroup.rotation.y -= delta * 0.01;
}
scene.add(cloudGroup);
const clouds = [
	'cloud01.glb',
	'cloud02.glb',
	/*'cloud03.glb',
	'cloud04.glb',*/
];
let loadedClouds = 0;
for (let index = 0; index < clouds.length; index++) {
	modelLoader.load('/clouds/' + clouds[index], (gltf) => {
		clouds[index] = gltf.scene.children[0];
		loadedClouds++;
		if (loadedClouds === clouds.length) {
			const count = 30;
			for (let index = 0; index < count; index++) {
				spawnCloud(index / count, count);
			}
		}
	});
}
const cloudMat = new THREE.MeshPhongMaterial({
	color: 0x444444,
	emissive: 0xF2D8FF,
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
	element.scale.setScalar(40 * Math.pow(Math.random(), 2) + 10);
	element.rotation.y = Math.random() * Math.PI * 2;
	element.position.y = 100 + (Math.random() > 0.5 ? 400 : 0);

	const direction = ((Math.random() * Math.PI * 2) / count) + (position * Math.PI * 2);
	const distance = Math.random() * 1000 + 400;
	element.position.x = Math.sin(direction) * distance;
	element.position.z = Math.cos(direction) * distance;
	cloudGroup.add(element);
};