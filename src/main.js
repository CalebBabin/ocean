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
		applyShader(material);
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
	1000
);
camera.position.z = 20;
camera.position.y = 2;


const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);

function resize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('DOMContentLoaded', () => {
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
	group.lifespan = 60000;
	group.timestamp = Date.now();
	group.position.z = camera.position.z * 2 * Math.random() - camera.position.z;

	const diff = Math.abs(group.position.z - camera.position.z);

	group.position.x = -15 * (diff / 10);

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
		0.5 + Math.random(),
		0,
		0
	);
	//group.velocity.normalize();

	group.lifespan = ((-group.position.x - group.position.x) / group.velocity.x) * 1000 * 1.1;

	group.update = () => { // called every frame
		let progress = (Date.now() - group.timestamp) / group.lifespan;
		if (progress < 0.1) { // grow to full size in first quarter
			group.position.y = progress * 10 - 1;
		} else if (progress > 0.75) { // shrink to nothing in last quarter
			group.position.y = (1 - progress) * 4 - 1;
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
const ambientLight = new THREE.AmbientLight(new THREE.Color('#00a390'), 0.25);
const sunLight = new THREE.DirectionalLight(new THREE.Color('#FFFFFF'), 1);
scene.add(ambientLight);
scene.add(sunLight);

import skyTextureURL from './sky.png';
scene.environment = new THREE.TextureLoader().load(skyTextureURL);
scene.background = scene.environment
scene.fog = new THREE.Fog(new THREE.Color('#FFFFFF'), 1, 80)

const ocean = new THREE.Mesh(
	new THREE.PlaneBufferGeometry(160, 60, Math.round(160 * 0.75), Math.round(60 * 0.75)),
	new THREE.MeshStandardMaterial({
		color: new THREE.Color('#57beff'),
		metalness: 0.05,
		roughness: 1,
		flatShading: true,
	})
);
applyShader(ocean.material);
ocean.geometry.rotateX(-Math.PI / 2);
scene.add(ocean);

import vert from './water.vert';
import snoiseShader from './snoise.glsl';
function applyShader(material) {
	const tickUniforms = () => {
		if (uniforms) {
			uniforms.u_time.value = performance.now();
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
			${vert}
		`);
	};

	// Make sure WebGLRenderer doesn't reuse a single program
	ocean.customProgramCacheKey = function () {
		return parseInt(window.shaderPID++); // some random ish number
	};
}