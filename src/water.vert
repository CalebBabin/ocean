vec4 vWorldPosition = modelMatrix * vec4(transformed.xyz, 1.0);
transformed.y += snoise(vec3(vWorldPosition.x * 0.25 - u_time * 0.0005, 0.0, vWorldPosition.z * 0.25)) * 0.5;
transformed.x += snoise(vec3(vWorldPosition.x * 0.1, 0.0, vWorldPosition.z * 0.1 + u_time * 0.0001)) * 0.25;