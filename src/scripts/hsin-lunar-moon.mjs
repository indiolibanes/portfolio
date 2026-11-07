/** A world-fixed sphere, using the approved lunar albedo and a restrained relief shader.
 * No time/camera uniforms, displacement pass, extra texture or post-processing. */
export function createLunarMoon(T,texture,radius) {
  const material=new T.ShaderMaterial({
    uniforms:{lunarMap:{value:texture},discRadius:{value:292/1024},lunarBrightness:{value:1}},
    vertexShader:`varying vec3 surface;
      void main(){surface=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform sampler2D lunarMap;uniform float discRadius;uniform float lunarBrightness;varying vec3 surface;
      void main(){
        vec3 n=normalize(surface);
        // The existing image is a disc atlas. Project its crater albedo onto the sphere;
        // repeat around the rear hemisphere, which remains in the same world orientation.
        vec2 uv=vec2(.5)+n.xy*discRadius*.97;
        vec3 albedo=texture2D(lunarMap,uv).rgb;
        float relief=dot(albedo,vec3(.2126,.7152,.0722));
        float terrain=sin(n.x*91.0+n.y*47.0)*sin(n.y*83.0-n.z*39.0)*.012;
        float light=.64+.36*max(0.0,dot(normalize(n+terrain),normalize(vec3(-.32,.38,1.0))));
        float limb=.76+.24*pow(abs(n.z),.40);
        vec3 champagne=mix(vec3(.88,.68,.35),vec3(1.0,.94,.76),clamp(relief,0.0,1.0));
        gl_FragColor=vec4(mix(champagne,albedo,.58)*light*limb*lunarBrightness,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,depthWrite:true,fog:false,toneMapped:false,
  });
  const moon=new T.Mesh(new T.SphereGeometry(radius,48,32),material);
  moon.name='Full moon · sculpted static sphere';return moon;
}
