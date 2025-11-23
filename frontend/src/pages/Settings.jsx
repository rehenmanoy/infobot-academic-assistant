/*
 Created on 23-03-2025
 Project: frontend
 Author: Donis Abraham
*/

import {Label} from "@/components/ui/label.jsx";
import {Separator} from "@/components/ui/separator.jsx";
import {Button} from "@/components/ui/button.jsx";
import {Input} from "@/components/ui/input.jsx";

export default function Settings() {


    return (

        <div className="w-full h-full bg-background  rounded-lg p-2 flex flex-col">
            <h3 className="text-primary font-bold text-2xl">Settings</h3>
            <div className="flex flex-row w-full h-full p-5 gap-5">
                <div className="flex w-full h-full flex-col border-2 border-primary-background gap-3 rounded-lg p-3">
                    <Label className="text-primary">Anthropic AI Settings</Label>
                    <Separator className="bg-primary"/>
                    <div className="w-full flex flex-row gap-2">
                        <div className="w-full flex flex-col gap-2 p-2">
                            <Label className="text-primary">Model</Label>
                            <select
                                className="w-full p-2 border rounded bg-background text-foreground border-gray-300
                                dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary">
                                <option value="">Select Model</option>
                                <option value="claude-3-7-sonnet-20250219">claude-3-7-sonnet-20250219 (Latest)</option>
                                <option value="claude-3-5-haiku-20241022">claude-3-5-haiku-20241022 (Latest)</option>
                                <option value="claude-3-opus-20240229">claude-3-opus-20240229 (Latest)</option>
                                <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet-20241022 </option>
                                <option value="claude-3-5-sonnet-20240620">claude-3-5-sonnet-20240620 </option>
                                <option value="claude-3-haiku-20240307">claude-3-haiku-20240307 </option>
                            </select>
                        </div>
                        <div className="w-full flex flex-col gap-2 p-2">
                            <Label className="text-primary">Max-Token</Label>
                            <Input type="number"/>
                        </div>
                    </div>
                    <div className="w-full flex flex-row gap-2">
                        <div className="w-full flex flex-col gap-2 p-2">
                            <Label className="text-primary">Temperature</Label>
                            <Input type="number" min="0" max="1" step="0.01" />
                        </div>
                        <div className="w-full flex flex-col gap-2 p-2">
                            <Label className="text-primary">API-Token</Label>
                            <Input />
                        </div>
                    </div>
                    <div className="w-full flex flex-row-reverse h-[60px]">
                        <Button>Save</Button>
                    </div>
                </div>
            </div>

        </div>
    )
}