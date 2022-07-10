vec4 vWorldPosition = modelMatrix * vec4(transformed.xyz, 1.0);
// color.y is green, helps target just the leaf, since I put the leaves and the tree in the same mesh and am too lazy to split it up now.
transformed.y += sin(vWorldPosition.x - u_time * 0.002) * pow(color.y, 2.0) * 0.1;
transformed.x += cos(vWorldPosition.x - u_time * 0.001) * pow(color.y, 2.0) * 0.1;
