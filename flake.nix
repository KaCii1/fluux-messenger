{
  description = "XMPP Messenger";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
        "x86_64-darwin"
      ];

      forAllSystems =
        f:
        nixpkgs.lib.genAttrs systems (
          system:
          f {
            inherit system;
            pkgs = nixpkgs.legacyPackages.${system};
          }
        );

      mkPackage =
        { system, pkgs }:
        let
          pname = "fluux-messenger";
          version = "0.15.1";
          lib = pkgs.lib;
          cargoRoot = "apps/fluux/src-tauri";
          src = ./.;
        in
        pkgs.buildNpmPackage {
          inherit pname version src;

          # nix build .# 2>&1 | grep 'got:' | awk '{print $2}'
          npmDepsHash = "sha256-BfwRmNSJxAozoO4hs3zpdyZ8NM/6TFnuSLLv8O3usGU=";

          inherit cargoRoot;
          cargoDeps = pkgs.rustPlatform.importCargoLock {
            lockFile = "${src}/${cargoRoot}/Cargo.lock";
          };

          nativeBuildInputs = with pkgs; [
            cargo
            rustc
            rustPlatform.cargoSetupHook
            cargo-tauri

            pkg-config
            nodejs
            makeWrapper
            autoPatchelfHook
            bash
          ];

          buildInputs =
            with pkgs;
            [
              openssl
              webkitgtk_4_1
              gtk3
              libsoup_3
              librsvg
              glib
              cairo
              pango
              gdk-pixbuf
              atk
              libxscrnsaver
              libappindicator-gtk3
              libayatana-appindicator
              fontconfig
              freetype
              harfbuzz
            ]
            ++ lib.optionals pkgs.stdenv.isLinux [
              glib-networking
              dbus
              gsettings-desktop-schemas
            ];

          env = {
            OPENSSL_NO_VENDOR = 1;
            CARGO_NET_OFFLINE = "true";
          };

          postPatch = ''
            # I don't know why patchShebangs isn't working here
            sed -i '1s|#!/bin/bash|#!${pkgs.bash}/bin/bash|' apps/fluux/scripts/tauri-build.sh
          '';

          npmBuildScript = "tauri:build";

          installPhase = ''
            runHook preInstall

            mkdir -p $out/bin

            ${lib.optionalString pkgs.stdenv.isLinux ''
              if [ -d "apps/fluux/src-tauri/target/release/bundle/deb" ]; then
                cd apps/fluux/src-tauri/target/release/bundle/deb
                for debfile in *.deb; do
                  if [ -f "$debfile" ]; then
                    ar p "$debfile" data.tar.gz | tar xz -C $out --strip-components=1 || true
                  fi
                done
                cd - > /dev/null
              fi

              if [ -f "apps/fluux/src-tauri/target/release/fluux" ]; then
                install -Dm755 apps/fluux/src-tauri/target/release/fluux $out/bin/.fluux-unwrapped
                
                # set LD_LIBRARY_PATH 
                makeWrapper $out/bin/.fluux-unwrapped $out/bin/fluux \
                  --prefix LD_LIBRARY_PATH : ${
                    lib.makeLibraryPath [
                      pkgs.libayatana-appindicator
                      pkgs.libappindicator-gtk3
                    ]
                  } \
                  --set WEBKIT_DISABLE_DMABUF_RENDERER "1" \
                  --prefix XDG_DATA_DIRS : "${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}" \
                  --prefix XDG_DATA_DIRS : "${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}" \
                  --prefix GIO_EXTRA_MODULES : "${pkgs.glib-networking}/lib/gio/modules"
              fi
            ''}

            # ${lib.optionalString pkgs.stdenv.isDarwin ''
              #   if [ -d "apps/fluux/src-tauri/target/release/bundle/macos" ]; then
              #     cp -r apps/fluux/src-tauri/target/release/bundle/macos/*.app $out/Applications/ || true
              #   fi
              # ''}

            runHook postInstall
          '';
        };
    in
    {
      packages = forAllSystems (
        { system, pkgs }:
        {
          default = mkPackage { inherit system pkgs; };
        }
      );
    };
}
