rustfmt "$@" $(git ls-files -zcmo --exclude-standard "*.rs" | sed "s/\x0/ /g")
