vec4 vWorldPosition = modelMatrix * vec4(transformed.xyz, 1.0);
transformed.y += snoise(vec3(vWorldPosition.x * 0.2 - u_time * 0.0005, 0.0, vWorldPosition.z * 0.2)) * 0.5;
transformed.y += snoise(vec3(vWorldPosition.x * 0.03 - u_time * 0.00025, 0.0, vWorldPosition.z * 0.03)) * 1.5;
transformed.x += snoise(vec3(vWorldPosition.x * 0.03 + u_time * 0.0001, 0.0, vWorldPosition.z * 0.03));