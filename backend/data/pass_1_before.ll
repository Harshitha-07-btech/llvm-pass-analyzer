define i32 @main() {
entry:
  %x = alloca i32, align 4
  store i32 5, i32* %x, align 4
  %0 = load i32, i32* %x, align 4
  %add = add nsw i32 %0, 10
  ret i32 %add
}
