vec4 vWorldPosition = modelMatrix * vec4(transformed.xyz, 1.0);
// color.y is green, helps target just the leaf
transformed.y += sin(vWorldPosition.x - u_time * 0.002) * pow(color.y, 2.0) * 0.1;
transformed.x += cos(vWorldPosition.x - u_time * 0.001) * pow(color.y, 2.0) * 0.1;
