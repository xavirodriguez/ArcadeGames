#!/bin/bash

# check-network-boundaries.sh
# Ensures that @tiny-aster/network does not import @tiny-aster/core, relative core paths,
# forbidden platform-specific, or game-specific modules.

NETWORK_PATH="packages/network/src"
EXIT_CODE=0

echo "🔍 Checking @tiny-aster/network boundaries..."

# 1. Prohibit @tiny-aster/core and relative core imports
FORBIDDEN_CORE=("@tiny-aster/core" "../core" "packages/core")

for core_ref in "${FORBIDDEN_CORE[@]}"; do
    if grep -r "$core_ref" "$NETWORK_PATH" --exclude-dir=__tests__ > /dev/null; then
        echo "❌ ERROR: Forbidden core import found: '$core_ref' in $NETWORK_PATH"
        grep -r "$core_ref" "$NETWORK_PATH" --exclude-dir=__tests__
        EXIT_CODE=1
    fi
done

# 2. Prohibit React Native / Expo / Colyseus imports
FORBIDDEN_PLATFORM=("react-native" "expo-" "@shopify/react-native-skia" "@colyseus")

for pkg in "${FORBIDDEN_PLATFORM[@]}"; do
    if grep -r "$pkg" "$NETWORK_PATH" --exclude-dir=__tests__ > /dev/null; then
        echo "❌ ERROR: Forbidden platform import found: '$pkg' in $NETWORK_PATH"
        grep -r "$pkg" "$NETWORK_PATH" --exclude-dir=__tests__
        EXIT_CODE=1
    fi
done

# 3. Prohibit imports from src/games or src/app (game-specific logic)
FORBIDDEN_DOMAIN=("src/games" "src/app")

for domain in "${FORBIDDEN_DOMAIN[@]}"; do
    if grep -r "$domain" "$NETWORK_PATH" > /dev/null; then
        echo "❌ ERROR: Network package should not depend on game-specific logic: '$domain' found in $NETWORK_PATH"
        grep -r "$domain" "$NETWORK_PATH"
        EXIT_CODE=1
    fi
done

# 4. Prohibit absolute imports or alias to 'src/'
if grep -r "@/src" "$NETWORK_PATH" > /dev/null; then
    echo "❌ ERROR: Prohibited absolute import '@/' found in $NETWORK_PATH"
    grep -r "@/src" "$NETWORK_PATH"
    EXIT_CODE=1
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Boundaries check passed! @tiny-aster/network is clean."
else
    echo "❌ Boundaries check failed."
fi

exit $EXIT_CODE
