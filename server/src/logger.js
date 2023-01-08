import chalk from "chalk";

export const info = message =>
  console.log(`${chalk.bgBlue(chalk.white(` INFO `))} ${message}`);

export const notice = message =>
  console.log(`${chalk.bgGreen(chalk.white(` NOTICE `))} ${message}`);

export const warn = message =>
  console.log(`${chalk.bgYellow(chalk.black(` WARN `))} ${message}`);

export const error = message =>
  console.log(`${chalk.bgRed(chalk.white(` ERROR `))} ${message}`);
