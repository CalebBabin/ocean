vec4 vWorldPosition = modelMatrix * vec4(transformed.xyz, 1.0);
transformed.x += sin(vWorldPosition.y * 0.025 + u_time * 0.0003) * (pow(vWorldPosition.y / 5.0, 2.0) * 0.1);